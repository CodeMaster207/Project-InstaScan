import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon";

interface Props {
  onCapture: (image: Blob) => void;
}

/**
 * Live camera with a capture button, plus an upload fallback (no camera, or permission denied).
 * The controls can be tucked away with the arrow, as in the draft ("slide down to hide the button").
 */
export function CameraView({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [controlsHidden, setControlsHidden] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser cannot open the camera. Upload a photo instead.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setReady(true);
        }
      } catch {
        setError("Camera access was blocked or is unavailable. Upload a photo instead.");
      }
    }

    void start();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => blob && onCapture(blob), "image/jpeg", 0.92);
  }

  return (
    <div className="camera">
      {error ? (
        <p className="camera-message">{error}</p>
      ) : (
        <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
      )}

      <button
        className="camera-toggle"
        onClick={() => setControlsHidden((hidden) => !hidden)}
        aria-expanded={!controlsHidden}
        aria-label={controlsHidden ? "Show the scan buttons" : "Hide the scan buttons"}
        title={controlsHidden ? "Show the scan buttons" : "Hide the scan buttons"}
      >
        <Icon name={controlsHidden ? "expand_less" : "expand_more"} />
      </button>

      {!controlsHidden && (
        <div className="camera-actions">
          <button
            className="fab"
            onClick={capture}
            disabled={!ready}
            aria-label="Scan receipt"
            title="Scan receipt"
          >
            <Icon name="photo_camera" />
          </button>
          <button className="btn btn-outline" onClick={() => fileRef.current?.click()}>
            <Icon name="photo_library" size={20} /> Upload photo
          </button>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onCapture(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
