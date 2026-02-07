import argparse
import json
import sys


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True)
    parser.add_argument("--model", default="base")
    parser.add_argument("--language", default="")
    parser.add_argument("--compute-type", default="int8")
    args = parser.parse_args()

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print(
            "Missing dependency: faster-whisper. Install it in your python environment.",
            file=sys.stderr,
        )
        return 2

    try:
        model = WhisperModel(args.model, device="cpu", compute_type=args.compute_type)
        kwargs = {"vad_filter": True, "beam_size": 1}
        if args.language:
            kwargs["language"] = args.language

        segments, info = model.transcribe(args.file, **kwargs)
        text = " ".join(segment.text.strip() for segment in segments if segment.text).strip()
        payload = {
            "text": text,
            "language": getattr(info, "language", args.language or "unknown"),
        }
        print(json.dumps(payload))
        return 0
    except Exception as exc:
        print(f"Whisper transcription failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
