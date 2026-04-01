import { DataSource } from 'typeorm';
import { PHOTO_REPOSITORY } from './photo.constants';
import { Photo } from './photo.entity';

export const photoProviders = [
  {
    inject: ['DATA_SOURCE'],
    provide: PHOTO_REPOSITORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Photo),
  },
];
