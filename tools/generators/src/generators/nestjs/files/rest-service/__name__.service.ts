import { Injectable } from '@nestjs/common';

@Injectable()
export class <%= namePascal %>Service {
  constructor() {
    // Inject and initialize as needed
  }

  async getData(): Promise<{ message: string }> {
    return {
      message: 'Hello from <%= namePascal %>Service',
    };
  }
}
