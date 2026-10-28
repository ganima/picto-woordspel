// Recording a word with the microphone (HANDOVER.md section 8): at most 5 seconds, stopped early by a second tap.
import { reactive } from 'vue';

const MAX_MS = 5000;

export const recorder = reactive({
  /** Id of the item being recorded, or null. */
  active: null as string | null,
  /** The browser or device has no usable microphone (or permission was refused). */
  blocked: false,
});

let current: { mr: MediaRecorder; timer: ReturnType<typeof setTimeout> } | null = null;

export function canRecord(): boolean {
  return !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
}

/** Start recording for `id`; resolves with the recording when it stops (second tap or after 5 s), or null. */
export async function record(id: string): Promise<Blob | null> {
  if (current) return null;
  if (!canRecord()) {
    recorder.blocked = true;
    return null;
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    recorder.blocked = true;
    return null;
  }
  const mr = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<Blob | null>((resolve) => {
    mr.onstop = () => {
      clearTimeout(current?.timer);
      stream.getTracks().forEach((t) => t.stop());
      current = null;
      recorder.active = null;
      const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
      resolve(blob.size ? blob : null);
    };
  });
  mr.start();
  current = { mr, timer: setTimeout(stop, MAX_MS) };
  recorder.active = id;
  return done;
}

export function stop(): void {
  if (current?.mr.state === 'recording') current.mr.stop();
}
