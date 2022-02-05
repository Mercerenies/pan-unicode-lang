export class StreamReader {
    constructor(stream) {
        this.buffer = "";
        this.bufferPos = 0;
        this.stream = stream !== null && stream !== void 0 ? stream : process.stdin;
    }
    readChar() {
        if (this.bufferPos >= this.buffer.length) {
            return new Promise((resolve, _reject) => {
                const dataHandler = (chunk) => {
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
                    resolve(null);
                };
                this.stream.on('data', dataHandler);
                this.stream.on('end', endHandler);
            });
        }
        else {
            const idx = this.bufferPos;
            this.bufferPos += 1;
            return Promise.resolve(this.buffer[idx]);
        }
    }
}
