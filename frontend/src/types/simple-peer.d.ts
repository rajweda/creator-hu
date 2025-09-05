declare module 'simple-peer' {
  interface SimplePeerOptions {
    initiator?: boolean;
    stream?: MediaStream;
    trickle?: boolean;
    config?: RTCConfiguration;
  }

  interface SimplePeerInstance {
    on(event: string, callback: (data: any) => void): void;
    signal(data: any): void;
    destroy(): void;
  }

  interface SimplePeerConstructor {
    new (options?: SimplePeerOptions): SimplePeerInstance;
  }

  const SimplePeer: SimplePeerConstructor;
  export = SimplePeer;
}