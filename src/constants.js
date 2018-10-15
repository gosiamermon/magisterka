export const CLASSIC_CASSANDRA_DB = 'Cassandra_classic';
export const EXPERIMENT_CASSANDRA_DB = 'Cassandra_experiment';
export const SESSION_CASSANDRA_DB = 'Cassandra_session';
export const MSSQL_DB = 'Mssql';
export const CLASSIC_MONGO_DB = 'Mongo_classic';
export const EXPERIMENT_MONGO_DB = 'Mongo_experiment';
export const SESSION_MONGO_DB = 'Mongo_session';

export const status = {
  notFound: '404',
}

export const stymulusTypes = {
  "image": 1,
  "video": 2,
  "Point2D": 3,
}

export const deviceTypes = {
  "head mounted": 1,
  "monitor mounted": 2
}

export const producers = {
  "Tobii": 1,
  "SMI": 2,
  "Eyelink": 3,
}

export const sex = {
  "female": 1,
  "male": 2,
}

export const educationLevel = {
  "primary": 1,
  "secondary": 2,
  "higher": 3,
}

export const stringFields = ["type", "startDate", "endDate", "deviceProducer", "educationLevel", "Profession"];