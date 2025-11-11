// Polyfill for Node compatibility with undici/cheerio
// File API is required by undici but not available in all Node versions
if (typeof global.File === 'undefined') {
  global.File = class File extends Blob {
    name: string;

    constructor(
      fileBits: BlobPart[],
      fileName: string,
      options?: FilePropertyBag
    ) {
      super(fileBits, options);
      Object.defineProperty(this, 'name', {
        value: fileName,
        writable: false,
        enumerable: true,
        configurable: false,
      });
    }
  } as any;
}
