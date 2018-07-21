import experiments from './experiments';
import sessions from './experimentSessions';
import subjects from './subjects';
import measurements from './measurements';

const classicUrl = 'classic/:dbType([A-z]+)';

export {
  experiments,
  sessions,
  subjects,
  measurements,
  classicUrl,
};
