from __future__ import annotations

import hashlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]

EXPECTED_GIT_BLOBS = {
    "backend/app/services/processor.py": "84cd6942f9a540ed2293938d5ae929c248bf4d07",
    "backend/app/services/queue.py": "d5588bdf008e741b5de432cd6669394be859bf9f",
    "backend/app/services/runs.py": "84d8f088144915b866764b496cb024bd69b49eac",
    "backend/app/services/outcomes.py": "a4af7ade3ae1de4c0e02901a5deeecce49b95f99",
    "backend/app/services/retry.py": "daa2a1425551edbddef30392a8bedbb1b9e2bb50",
    "backend/app/services/quota.py": "2dcd920b0584a0a4965de508967ec63f6d5ada5c",
    "backend/app/services/distribution.py": "b4b08f7f3e3a904f81d6ab4d268140684012a992",
    "backend/app/services/worklist.py": "1a0ff03ca65c411a8a3f718517ffaa7e38f6eabc",
    "backend/app/workers/supervisor.py": "3543e05c0937124d17e54b13966c1e5f428ff160",
    "backend/app/vk/client.py": "484541cf34bd8cab396ab5cf2f125605581b2a67",
}


def git_blob_sha(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def test_v0410_does_not_modify_frozen_sender_core():
    actual = {
        relative: git_blob_sha((ROOT / relative).read_bytes())
        for relative in EXPECTED_GIT_BLOBS
    }
    assert actual == EXPECTED_GIT_BLOBS
