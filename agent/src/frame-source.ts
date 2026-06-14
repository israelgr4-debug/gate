import { spawn, type ChildProcess } from 'node:child_process';
import { config } from './config.js';
import { logger } from './logger.js';

const log = logger.child({ component: 'frames' });

const SOI = Buffer.from([0xff, 0xd8]);
const EOI = Buffer.from([0xff, 0xd9]);

export type FrameHandler = (frame: Buffer) => void | Promise<void>;

export class RtspFrameSource {
  private proc: ChildProcess | null = null;
  private buf: Buffer = Buffer.alloc(0);
  private stopping = false;

  constructor(private onFrame: FrameHandler) {}

  start(): void {
    this.stopping = false;
    this.spawnFFmpeg();
  }

  private spawnFFmpeg(): void {
    const fps = Math.max(1, Math.round(1000 / config.camera.frameIntervalMs));
    const args = [
      '-rtsp_transport', 'tcp',
      '-i', config.camera.rtspUrl,
      '-vf', `fps=${fps}`,
      '-q:v', '4',
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      '-',
    ];
    log.info({ fps }, 'ffmpeg starting');
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    this.proc = proc;

    proc.stdout?.on('data', (chunk: Buffer) => this.consume(chunk));
    proc.stderr?.on('data', (d) => log.trace({ ffmpeg: d.toString() }));

    proc.on('exit', (code) => {
      log.warn({ code }, 'ffmpeg exited');
      this.proc = null;
      if (!this.stopping) {
        setTimeout(() => this.spawnFFmpeg(), 2000);
      }
    });
  }

  private consume(chunk: Buffer): void {
    this.buf = Buffer.concat([this.buf, chunk]);
    while (true) {
      const start = this.buf.indexOf(SOI);
      if (start < 0) {
        if (this.buf.length > 1) this.buf = this.buf.subarray(this.buf.length - 1);
        return;
      }
      const end = this.buf.indexOf(EOI, start + 2);
      if (end < 0) {
        if (start > 0) this.buf = this.buf.subarray(start);
        return;
      }
      const frame = this.buf.subarray(start, end + 2);
      this.buf = this.buf.subarray(end + 2);
      Promise.resolve(this.onFrame(Buffer.from(frame))).catch((err) =>
        log.warn({ err }, 'frame handler threw'),
      );
    }
  }

  stop(): void {
    this.stopping = true;
    if (this.proc) {
      this.proc.kill('SIGTERM');
      this.proc = null;
    }
  }
}
