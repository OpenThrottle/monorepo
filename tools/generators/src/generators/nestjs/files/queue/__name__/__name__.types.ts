import { Job, Queue } from 'bullmq';
import { queueName } from './<%= name %>.constants';

export type <%= namePascal %>Data = {
  question: string;
  uuid: string;
};

export type <%= namePascal %>Queue = Queue<
  <%= namePascal %>Data,
  void
>;

export type <%= namePascal %>Job = Job<
  <%= namePascal %>Data,
  void
>;
