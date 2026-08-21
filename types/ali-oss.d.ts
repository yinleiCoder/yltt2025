declare module "ali-oss" {
  type OssOptions = {
    region: string;
    bucket: string;
    accessKeyId: string;
    accessKeySecret: string;
    endpoint?: string;
  };

  type SignatureUrlOptions = {
    method?: "GET" | "PUT" | "POST" | "DELETE" | "HEAD";
    expires?: number;
    "Content-Type"?: string;
  };

  class OSS {
    constructor(options: OssOptions);
    signatureUrl(name: string, options?: SignatureUrlOptions): string;
    delete(name: string): Promise<unknown>;
  }

  export = OSS;
}
