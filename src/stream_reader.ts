
import * as Stream from 'stream';

export class StreamReader {
  private buffer: string;
  private bufferPos: number;
  private readonly stream: Stream.Readable;

  constructor(stream?: Stream.Readable) {
    this.buffer = "";
    this.bufferPos = 0;
    this.stream = stream ?? process.stdin;
  }

  readChar(): Promise<string | null> {
    if (this.bufferPos >= this.buffer.length) {
      return new Promise((resolve, reject) => {
        const dataHandler = (chunk: Buffer) => {
          this.buffer = chunk.toString();
          this.bufferPos = 0;
          if (this.buffer.length > 0) {
            this.stream.removeListener('data', dataHandler);
            this.stream.removeListener('end', endHandler);
            this.bufferPos += 1;
            resolve(this.buffer[0]);
          }
        };
        const endHandler = () => {
          this.stream.removeListener('data', dataHandler);
          this.stream.removeListener('end', endHandler);
          resolve(null)
        };
        this.stream.on('data', dataHandler);
        this.stream.on('end', endHandler);
      });
    } else {
      const idx = this.bufferPos;
      this.bufferPos += 1;
      return Promise.resolve(this.buffer[idx]);
    }
  }

}
