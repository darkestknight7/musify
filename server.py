import asyncio
import os
import time
from typing import Optional
import httpx
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from ytmusicapi import YTMusic
import yt_dlp

app = FastAPI(title="Musify API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ytmusic = YTMusic()

# Simple in-memory caches
_stream_cache: dict[str, tuple[str, str, dict, float]] = {}       # video_id -> (url, mime_type, headers, expires_at)
_video_cache: dict[str, tuple[str, str, str, dict, float]] = {}   # video_id -> (url, mime_type, quality, headers, expires_at)
_home_cache: Optional[tuple[dict, float]] = None
STREAM_CACHE_TTL = 1800  # 30 minutes
HOME_CACHE_TTL = 600     # 10 minutes


def _best_thumbnail(thumbnails: list) -> str:
    if not thumbnails:
        return ""
    # Return highest resolution thumbnail
    sorted_thumbs = sorted(thumbnails, key=lambda t: t.get("width", 0), reverse=True)
    url = sorted_thumbs[0].get("url", "")
    # Upgrade googleusercontent thumbnail size for crisp album art
    if "lh3.googleusercontent.com" in url and "=w" in url:
        base = url.split("=w")[0]
        return f"{base}=w544-h544-l90-rj"
    return url


def _normalize_track(item: dict, fallback_thumb: str = "") -> Optional[dict]:
    video_id = item.get("videoId")
    if not video_id:
        return None
    artists = item.get("artists") or []
    artist_str = ", ".join(a.get("name", "") for a in artists if a.get("name")) or "Unknown Artist"
    artist_id = artists[0].get("id") if artists and artists[0].get("id") else None
    album = item.get("album") or {}
    album_name = album.get("name", "") if isinstance(album, dict) else ""
    album_id = album.get("id") if isinstance(album, dict) else None
    thumb = _best_thumbnail(item.get("thumbnails", [])) or fallback_thumb or f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
    duration = item.get("duration") or ""
    duration_sec = item.get("duration_seconds")
    if not duration_sec and duration and ":" in str(duration):
        parts = str(duration).split(":")
        try:
            if len(parts) == 2:
                duration_sec = int(parts[0]) * 60 + int(parts[1])
            elif len(parts) == 3:
                duration_sec = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        except ValueError:
            duration_sec = 0
    return {
        "videoId": video_id,
        "title": item.get("title", "Unknown Track"),
        "artist": artist_str,
        "artistId": artist_id,
        "artists": artists,
        "album": album_name,
        "albumId": album_id,
        "thumbnail": thumb,
        "duration": duration,
        "durationSeconds": duration_sec or 0,
        "isExplicit": item.get("isExplicit", False),
    }


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "Musify"}


@app.get("/api/home")
def get_home():
    global _home_cache
    now = time.time()
    if _home_cache and now < _home_cache[1]:
        return _home_cache[0]

    sections = []
    quick_picks = []

    try:
        home_data = ytmusic.get_home(limit=6)
        for sec in home_data:
            title = sec.get("title", "Recommended")
            contents = sec.get("contents", [])
            items = []
            for c in contents:
                if c.get("videoId"):
                    track = _normalize_track(c)
                    if track:
                        track["type"] = "song"
                        items.append(track)
                        if len(quick_picks) < 8:
                            quick_picks.append(track)
                elif c.get("browseId"):
                    items.append({
                        "type": "album" if c.get("browseId", "").startswith("MPRE") else "playlist",
                        "id": c.get("browseId"),
                        "playlistId": c.get("playlistId") or c.get("browseId"),
                        "title": c.get("title", ""),
                        "subtitle": c.get("description") or ", ".join(a.get("name", "") for a in (c.get("artists") or [])),
                        "thumbnail": _best_thumbnail(c.get("thumbnails", [])),
                    })
            if items:
                sections.append({"title": title, "items": items[:12]})
    except Exception:
        pass

    # Always also try charts for reliable Trending / Top Hits
    try:
        charts = ytmusic.get_charts(country="US")
        videos = charts.get("videos", {}).get("items", []) if isinstance(charts.get("videos"), dict) else []
        songs = charts.get("songs", {}).get("items", []) if isinstance(charts.get("songs"), dict) else []
        chart_tracks = []
        for item in (songs or videos)[:15]:
            t = _normalize_track(item)
            if t:
                t["type"] = "song"
                chart_tracks.append(t)
                if len(quick_picks) < 8:
                    quick_picks.append(t)
        if chart_tracks:
            sections.insert(0, {"title": "Trending Now", "items": chart_tracks})

        artists_list = charts.get("artists", {}).get("items", []) if isinstance(charts.get("artists"), dict) else []
        if artists_list:
            sections.append({
                "title": "Popular Artists",
                "items": [
                    {
                        "type": "artist",
                        "id": a.get("browseId"),
                        "title": a.get("title", ""),
                        "subtitle": f"{a.get('subscribers', '')} subscribers".strip() if a.get("subscribers") else "Artist",
                        "thumbnail": _best_thumbnail(a.get("thumbnails", [])),
                    }
                    for a in artists_list[:10] if a.get("browseId")
                ]
            })
    except Exception:
        pass

    result = {
        "quickPicks": quick_picks[:8],
        "sections": sections,
    }
    _home_cache = (result, now + HOME_CACHE_TTL)
    return result


@app.get("/api/search")
def search(q: str, filter: Optional[str] = None):
    if not q or not q.strip():
        return {"songs": [], "artists": [], "albums": [], "playlists": [], "topResult": None}

    query = q.strip()
    try:
        if filter in ("songs", "videos", "albums", "artists", "playlists"):
            raw = ytmusic.search(query, filter=filter, limit=25)
            if filter in ("songs", "videos"):
                songs = [t for t in (_normalize_track(r) for r in raw) if t]
                return {"songs": songs, "artists": [], "albums": [], "playlists": [], "topResult": songs[0] if songs else None}
            elif filter == "artists":
                artists = [
                    {
                        "type": "artist",
                        "id": r.get("browseId"),
                        "title": r.get("artist") or r.get("title", ""),
                        "subtitle": "Artist",
                        "thumbnail": _best_thumbnail(r.get("thumbnails", [])),
                    }
                    for r in raw if r.get("browseId")
                ]
                return {"songs": [], "artists": artists, "albums": [], "playlists": [], "topResult": artists[0] if artists else None}
            elif filter == "albums":
                albums = [
                    {
                        "type": "album",
                        "id": r.get("browseId"),
                        "title": r.get("title", ""),
                        "subtitle": f"{r.get('year', '')} • {', '.join(a.get('name', '') for a in (r.get('artists') or []))}".strip(" •"),
                        "thumbnail": _best_thumbnail(r.get("thumbnails", [])),
                    }
                    for r in raw if r.get("browseId")
                ]
                return {"songs": [], "artists": [], "albums": albums, "playlists": [], "topResult": albums[0] if albums else None}
            elif filter == "playlists":
                playlists = [
                    {
                        "type": "playlist",
                        "id": r.get("browseId"),
                        "title": r.get("title", ""),
                        "subtitle": f"By {r.get('author', 'YouTube Music')}",
                        "thumbnail": _best_thumbnail(r.get("thumbnails", [])),
                    }
                    for r in raw if r.get("browseId")
                ]
                return {"songs": [], "artists": [], "albums": [], "playlists": playlists, "topResult": playlists[0] if playlists else None}

        # Combined search (like Spotify's "All" tab)
        songs_raw = ytmusic.search(query, filter="songs", limit=12)
        songs = [t for t in (_normalize_track(r) for r in songs_raw) if t]

        all_raw = ytmusic.search(query, limit=15)
        artists = []
        albums = []
        playlists = []
        seen_ids = set()

        for r in all_raw:
            rtype = r.get("resultType")
            bid = r.get("browseId")
            if bid and bid in seen_ids:
                continue
            if bid:
                seen_ids.add(bid)
            if rtype == "artist" and bid:
                artists.append({
                    "type": "artist",
                    "id": bid,
                    "title": r.get("artist") or r.get("title", ""),
                    "subtitle": "Artist",
                    "thumbnail": _best_thumbnail(r.get("thumbnails", [])),
                })
            elif rtype == "album" and bid:
                albums.append({
                    "type": "album",
                    "id": bid,
                    "title": r.get("title", ""),
                    "subtitle": f"{r.get('year', '')} • {', '.join(a.get('name', '') for a in (r.get('artists') or []))}".strip(" •"),
                    "thumbnail": _best_thumbnail(r.get("thumbnails", [])),
                })
            elif rtype == "playlist" and bid:
                playlists.append({
                    "type": "playlist",
                    "id": bid,
                    "title": r.get("title", ""),
                    "subtitle": f"Playlist • {r.get('author', 'YouTube Music')}",
                    "thumbnail": _best_thumbnail(r.get("thumbnails", [])),
                })

        top_result = None
        if songs:
            top_result = {**songs[0], "type": "song"}
        elif artists:
            top_result = artists[0]

        return {
            "topResult": top_result,
            "songs": songs,
            "artists": artists[:8],
            "albums": albums[:8],
            "playlists": playlists[:8],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/album/{browse_id}")
def get_album(browse_id: str):
    try:
        data = ytmusic.get_album(browse_id)
        thumb = _best_thumbnail(data.get("thumbnails", []))
        artists = data.get("artists") or []
        artist_str = ", ".join(a.get("name", "") for a in artists if a.get("name")) or "Various Artists"
        tracks = []
        for t in data.get("tracks", []):
            norm = _normalize_track(t, fallback_thumb=thumb)
            if norm:
                if not norm["album"]:
                    norm["album"] = data.get("title", "")
                if not norm["albumId"]:
                    norm["albumId"] = browse_id
                tracks.append(norm)
        return {
            "id": browse_id,
            "type": "album",
            "title": data.get("title", "Album"),
            "artist": artist_str,
            "year": data.get("year", ""),
            "trackCount": data.get("trackCount", len(tracks)),
            "duration": data.get("duration", ""),
            "thumbnail": thumb,
            "description": data.get("description", ""),
            "tracks": tracks,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/playlist/{playlist_id}")
def get_playlist(playlist_id: str):
    try:
        clean_id = playlist_id.replace("VL", "", 1) if playlist_id.startswith("VL") else playlist_id
        data = ytmusic.get_playlist(clean_id, limit=100)
        thumb = _best_thumbnail(data.get("thumbnails", []))
        tracks = []
        for t in data.get("tracks", []):
            norm = _normalize_track(t, fallback_thumb=thumb)
            if norm:
                tracks.append(norm)
        author = data.get("author")
        author_name = author.get("name", "Musify") if isinstance(author, dict) else (author or "Musify")
        return {
            "id": playlist_id,
            "type": "playlist",
            "title": data.get("title", "Playlist"),
            "author": author_name,
            "trackCount": data.get("trackCount", len(tracks)),
            "duration": data.get("duration", ""),
            "thumbnail": thumb or (tracks[0]["thumbnail"] if tracks else ""),
            "description": data.get("description", ""),
            "tracks": tracks,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/artist/{channel_id}")
def get_artist(channel_id: str):
    try:
        data = ytmusic.get_artist(channel_id)
        thumb = _best_thumbnail(data.get("thumbnails", []))
        top_songs = []
        songs_sec = data.get("songs", {})
        for t in songs_sec.get("results", []):
            norm = _normalize_track(t)
            if norm:
                top_songs.append(norm)

        albums = []
        for a in (data.get("albums", {}).get("results", []) + data.get("singles", {}).get("results", [])):
            if a.get("browseId"):
                albums.append({
                    "type": "album",
                    "id": a.get("browseId"),
                    "title": a.get("title", ""),
                    "subtitle": a.get("year", "Album"),
                    "thumbnail": _best_thumbnail(a.get("thumbnails", [])),
                })

        return {
            "id": channel_id,
            "name": data.get("name", "Artist"),
            "subscribers": data.get("subscribers", ""),
            "description": data.get("description", ""),
            "thumbnail": thumb,
            "topSongs": top_songs[:10],
            "albums": albums[:12],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/watch/{video_id}")
def get_watch_next(video_id: str):
    try:
        watch = ytmusic.get_watch_playlist(videoId=video_id, limit=15)
        tracks = []
        for t in watch.get("tracks", []):
            norm = _normalize_track(t)
            if norm and norm["videoId"] != video_id:
                tracks.append(norm)
        return {
            "tracks": tracks,
            "lyricsId": watch.get("lyrics"),
        }
    except Exception as e:
        return {"tracks": [], "lyricsId": None}


@app.get("/api/lyrics/{video_id}")
def get_lyrics(video_id: str):
    try:
        watch = ytmusic.get_watch_playlist(videoId=video_id, limit=1)
        lyrics_id = watch.get("lyrics")
        if not lyrics_id:
            return {"lyrics": None, "source": None}
        lyrics_data = ytmusic.get_lyrics(lyrics_id)
        return {
            "lyrics": lyrics_data.get("lyrics"),
            "source": lyrics_data.get("source"),
        }
    except Exception:
        return {"lyrics": None, "source": None}


@app.get("/api/synced-lyrics")
async def get_synced_lyrics(
    title: str,
    artist: str = "",
    duration: int = 0,
    video_id: str = "",
):
    # 1. Try LRCLIB (same synced-lyrics source used by SimpMusic)
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            params = {"track_name": title}
            if artist:
                params["artist_name"] = artist.split(",")[0].strip()
            if duration > 0:
                params["duration"] = duration
            resp = await client.get("https://lrclib.net/api/get", params=params)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("syncedLyrics"):
                    return {
                        "syncedLyrics": data["syncedLyrics"],
                        "plainLyrics": data.get("plainLyrics"),
                        "source": "LRCLIB (Synced)",
                    }
                if data.get("plainLyrics"):
                    return {
                        "syncedLyrics": None,
                        "plainLyrics": data["plainLyrics"],
                        "source": "LRCLIB",
                    }

            # Fallback to LRCLIB search
            search_resp = await client.get(
                "https://lrclib.net/api/search",
                params={"q": f"{title} {artist.split(',')[0].strip()}".strip()},
            )
            if search_resp.status_code == 200:
                items = search_resp.json()
                if items:
                    best = next((i for i in items if i.get("syncedLyrics")), items[0])
                    return {
                        "syncedLyrics": best.get("syncedLyrics"),
                        "plainLyrics": best.get("plainLyrics"),
                        "source": "LRCLIB (Synced)" if best.get("syncedLyrics") else "LRCLIB",
                    }
    except Exception:
        pass

    # 2. Fallback to YouTube Music lyrics
    if video_id:
        yt_res = get_lyrics(video_id)
        if yt_res.get("lyrics"):
            return {
                "syncedLyrics": None,
                "plainLyrics": yt_res["lyrics"],
                "source": yt_res.get("source") or "YouTube Music",
            }

    return {"syncedLyrics": None, "plainLyrics": None, "source": None}


@app.get("/api/sponsorblock/{video_id}")
async def get_sponsorblock_segments(video_id: str):
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                "https://sponsor.ajay.app/api/skipSegments",
                params={
                    "videoID": video_id,
                    "categories": '["music_offtopic","sponsor","intro","outro"]',
                },
            )
            if resp.status_code == 200:
                segments = resp.json()
                return {
                    "segments": [
                        {
                            "start": s["segment"][0],
                            "end": s["segment"][1],
                            "category": s.get("category", "non-music"),
                        }
                        for s in segments
                        if isinstance(s.get("segment"), list) and len(s["segment"]) == 2
                    ]
                }
    except Exception:
        pass
    return {"segments": []}


def _extract_audio_url(video_id: str) -> tuple[str, str, dict]:
    now = time.time()
    cached = _stream_cache.get(video_id)
    if cached and now < cached[3]:
        return cached[0], cached[1], cached[2]

    ydl_opts = {
        "format": "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best",
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "extract_flat": False,
        "js_runtimes": {"node": {}},
        "remote_components": ["ejs:github"],
    }
    url = f"https://www.youtube.com/watch?v={video_id}"
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        stream_url = info.get("url")
        ext = info.get("ext", "m4a")
        http_headers = dict(info.get("http_headers") or {})
        if not stream_url:
            # Fallback pick from formats
            formats = info.get("formats", [])
            audio_formats = [f for f in formats if f.get("acodec") != "none" and f.get("url")]
            if audio_formats:
                best = sorted(audio_formats, key=lambda f: f.get("abr") or 0, reverse=True)[0]
                stream_url = best["url"]
                ext = best.get("ext", "m4a")
                if best.get("http_headers"):
                    http_headers = dict(best["http_headers"])

        if not stream_url:
            raise HTTPException(status_code=404, detail="No audio stream found")

        mime_map = {
            "m4a": "audio/mp4",
            "mp4": "audio/mp4",
            "webm": "audio/webm",
            "opus": "audio/ogg",
            "mp3": "audio/mpeg",
        }
        mime_type = mime_map.get(ext, "audio/mp4")
        _stream_cache[video_id] = (stream_url, mime_type, http_headers, now + STREAM_CACHE_TTL)
        return stream_url, mime_type, http_headers


@app.get("/api/audio/{video_id}")
async def stream_audio(video_id: str, request: Request):
    try:
        stream_url, mime_type, ydl_headers = await asyncio.to_thread(_extract_audio_url, video_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stream extraction failed: {e}")

    headers = dict(ydl_headers)
    range_header = request.headers.get("range")
    if range_header:
        headers["Range"] = range_header

    client = httpx.AsyncClient(timeout=30.0, follow_redirects=True)
    req = client.build_request("GET", stream_url, headers=headers)
    upstream = await client.send(req, stream=True)

    if upstream.status_code >= 400:
        await upstream.aclose()
        await client.aclose()
        # Invalidate cache and retry once
        _stream_cache.pop(video_id, None)
        stream_url, mime_type, ydl_headers = await asyncio.to_thread(_extract_audio_url, video_id)
        headers = dict(ydl_headers)
        if range_header:
            headers["Range"] = range_header
        client = httpx.AsyncClient(timeout=30.0, follow_redirects=True)
        req = client.build_request("GET", stream_url, headers=headers)
        upstream = await client.send(req, stream=True)

    resp_headers = {
        "Content-Type": upstream.headers.get("content-type", mime_type),
        "Accept-Ranges": "bytes",
    }
    if "content-length" in upstream.headers:
        resp_headers["Content-Length"] = upstream.headers["content-length"]
    if "content-range" in upstream.headers:
        resp_headers["Content-Range"] = upstream.headers["content-range"]

    async def iter_stream():
        try:
            async for chunk in upstream.aiter_bytes(chunk_size=65536):
                yield chunk
        finally:
            await upstream.aclose()
            await client.aclose()

    return StreamingResponse(
        iter_stream(),
        status_code=upstream.status_code,
        headers=resp_headers,
    )


@app.get("/api/download/{video_id}")
async def download_audio(video_id: str, title: str = "track"):
    try:
        stream_url, mime_type, ydl_headers = await asyncio.to_thread(_extract_audio_url, video_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download extraction failed: {e}")

    ext = "webm" if "webm" in mime_type else "ogg" if "ogg" in mime_type else "m4a"
    safe_title = "".join(c for c in title if c.isalnum() or c in " -_()").strip() or video_id

    headers = dict(ydl_headers)
    client = httpx.AsyncClient(timeout=60.0, follow_redirects=True)
    req = client.build_request("GET", stream_url, headers=headers)
    upstream = await client.send(req, stream=True)

    resp_headers = {
        "Content-Type": upstream.headers.get("content-type", mime_type),
        "Content-Disposition": f'attachment; filename="{safe_title}.{ext}"',
    }
    if "content-length" in upstream.headers:
        resp_headers["Content-Length"] = upstream.headers["content-length"]

    async def iter_stream():
        try:
            async for chunk in upstream.aiter_bytes(chunk_size=65536):
                yield chunk
        finally:
            await upstream.aclose()
            await client.aclose()

    return StreamingResponse(
        iter_stream(),
        status_code=200,
        headers=resp_headers,
    )


def _extract_video_url(video_id: str) -> tuple[str, str, str, dict]:
    now = time.time()
    cached = _video_cache.get(video_id)
    if cached and now < cached[4]:
        return cached[0], cached[1], cached[2], cached[3]

    ydl_opts = {
        "format": "best[ext=mp4][vcodec!=none][acodec!=none]/best[vcodec!=none][acodec!=none]/best",
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "js_runtimes": {"node": {}},
        "remote_components": ["ejs:github"],
    }
    url = f"https://www.youtube.com/watch?v={video_id}"
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        stream_url = info.get("url")
        ext = info.get("ext", "mp4")
        height = info.get("height")
        quality = f"{height}p" if height else "HD"
        http_headers = dict(info.get("http_headers") or {})

        if not stream_url:
            formats = info.get("formats", [])
            muxed = [
                f for f in formats
                if f.get("vcodec") != "none" and f.get("acodec") != "none" and f.get("url")
            ]
            if muxed:
                best = sorted(muxed, key=lambda f: f.get("height") or 0, reverse=True)[0]
                stream_url = best["url"]
                ext = best.get("ext", "mp4")
                quality = f"{best.get('height')}p" if best.get("height") else "HD"
                if best.get("http_headers"):
                    http_headers = dict(best["http_headers"])

        if not stream_url:
            raise HTTPException(status_code=404, detail="No video stream found")

        mime_type = "video/webm" if ext == "webm" else "video/mp4"
        _video_cache[video_id] = (stream_url, mime_type, quality, http_headers, now + STREAM_CACHE_TTL)
        return stream_url, mime_type, quality, http_headers


@app.get("/api/video-info/{video_id}")
async def get_video_info(video_id: str):
    try:
        _, mime_type, quality, _ = await asyncio.to_thread(_extract_video_url, video_id)
        return {"available": True, "quality": quality, "mimeType": mime_type}
    except Exception:
        return {"available": False, "quality": None, "mimeType": None}


@app.get("/api/video/{video_id}")
async def stream_video(video_id: str, request: Request):
    try:
        stream_url, mime_type, _, ydl_headers = await asyncio.to_thread(_extract_video_url, video_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video extraction failed: {e}")

    headers = dict(ydl_headers)
    range_header = request.headers.get("range")
    if range_header:
        headers["Range"] = range_header

    client = httpx.AsyncClient(timeout=30.0, follow_redirects=True)
    req = client.build_request("GET", stream_url, headers=headers)
    upstream = await client.send(req, stream=True)

    if upstream.status_code >= 400:
        await upstream.aclose()
        await client.aclose()
        _video_cache.pop(video_id, None)
        stream_url, mime_type, _, ydl_headers = await asyncio.to_thread(_extract_video_url, video_id)
        headers = dict(ydl_headers)
        if range_header:
            headers["Range"] = range_header
        client = httpx.AsyncClient(timeout=30.0, follow_redirects=True)
        req = client.build_request("GET", stream_url, headers=headers)
        upstream = await client.send(req, stream=True)

    resp_headers = {
        "Content-Type": upstream.headers.get("content-type", mime_type),
        "Accept-Ranges": "bytes",
    }
    if "content-length" in upstream.headers:
        resp_headers["Content-Length"] = upstream.headers["content-length"]
    if "content-range" in upstream.headers:
        resp_headers["Content-Range"] = upstream.headers["content-range"]

    async def iter_stream():
        try:
            async for chunk in upstream.aiter_bytes(chunk_size=65536):
                yield chunk
        finally:
            await upstream.aclose()
            await client.aclose()

    return StreamingResponse(
        iter_stream(),
        status_code=upstream.status_code,
        headers=resp_headers,
    )


# Serve built frontend (dist/) when running as a standalone app
_dist_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")
if os.path.isdir(_dist_dir):
    _assets_dir = os.path.join(_dist_dir, "assets")
    if os.path.isdir(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path == "api":
            raise HTTPException(status_code=404, detail="API endpoint not found")
        candidate = os.path.abspath(os.path.join(_dist_dir, full_path))
        if (
            full_path
            and os.path.commonpath([os.path.abspath(_dist_dir), candidate]) == os.path.abspath(_dist_dir)
            and os.path.isfile(candidate)
        ):
            return FileResponse(candidate)
        return FileResponse(os.path.join(_dist_dir, "index.html"))


if __name__ == "__main__":
    import argparse
    import socket
    import subprocess
    import uvicorn

    parser = argparse.ArgumentParser(description="Musify Backend & Web Server")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on")
    parser.add_argument(
        "--public",
        action="store_true",
        help="Start a public HTTPS tunnel (localhost.run) for phones & tablets",
    )
    args = parser.parse_args()

    try:
        lan_ip = socket.gethostbyname(socket.gethostname())
    except Exception:
        lan_ip = "YOUR_PC_IP"

    print(f"\n  Musify PC URL:       http://127.0.0.1:{args.port}")
    print(f"  Same Wi-Fi Devices:  http://{lan_ip}:{args.port}")
    print("  (Do NOT open 127.0.0.1 on your phone — use the Wi-Fi IP or --public HTTPS link)\n")

    tunnel_proc = None
    if args.public:
        print("  Starting public HTTPS tunnel for phones & tablets...")
        tunnel_proc = subprocess.Popen(
            [
                "ssh",
                "-o", "StrictHostKeyChecking=no",
                "-o", "ServerAliveInterval=30",
                "-R", f"80:127.0.0.1:{args.port}",
                "nokey@localhost.run",
            ]
        )

    try:
        uvicorn.run(app, host="0.0.0.0", port=args.port)
    finally:
        if tunnel_proc:
            tunnel_proc.terminate()
