// @ts-check
const sql = require('mssql');
import { MSSQL_DB, CLASSIC_CASSANDRA_DB, CLASSIC_MONGO_DB } from '../../constants';
import { mssql, cassandra, mongo } from '../../routes/shared';
import { getSubjectModel } from '../../models/api_classic/mongo';
import { sex, educationLevel } from '../../constants';

let Subject;

class SubjectDAL {
  constructor(db) {
    this.cassandraDB = db[CLASSIC_CASSANDRA_DB];
    this.mssqlDB = db[MSSQL_DB];
    Subject = getSubjectModel(db[CLASSIC_MONGO_DB]);
  }

  async getSubjectsFromCassandra() {
    let subjects = await this.cassandraDB.execute('SELECT * FROM subject');
    subjects = subjects.rows;
    return subjects;
  };

  async getSubjectsFromMssql() {
    const subjectsResult = await this.mssqlDB.request()
      .query(`SELECT Subject.*, 
           Sex.Value AS Sex, 
           EducationLevel.Value AS EducationLevel 
           FROM Subject
           LEFT JOIN Sex ON Subject.SexId = Sex.Id
           LEFT JOIN EducationLevel ON Subject.EducationLevelId = EducationLevel.Id`);
    return subjectsResult.recordset;
  };

  async getSubjectsFromMongo() {
    return await Subject.find();
  };

  async getSubjectFromMssql(id) {
    const subjectResult = await this.mssqlDB.request()
      .input('id', sql.Int, id)
      .query(`SELECT Subject.*, 
           Sex.Value AS Sex, 
           EducationLevel.Value AS EducationLevel 
           FROM Subject
           LEFT JOIN Sex ON Subject.SexId = Sex.Id
           LEFT JOIN EducationLevel ON Subject.EducationLevelId = EducationLevel.Id
           WHERE Subject.id=@id`);
    const subject = subjectResult.recordset[0];
    return subject;
  };

  async getSubjectFromMongo(id) {
    return await Subject.findOne({ _id: id });
  };

  async getSubjectFromCassandra(id) {
    const subject = await this.cassandraDB.execute(
      `SELECT * FROM subject
        WHERE id=${id}`
    );
    return subject.rows[0];
  };

  async saveSubjectToMssql(subject) {
    const declareInsertValues = `DECLARE @inserted table([Id] int)`;
    let query = `${declareInsertValues}
                INSERT INTO Subject
                OUTPUT INSERTED.[Id] INTO @inserted
                VALUES (${subject.age}, 
                  ${sex[subject.sex]}, 
                  ${educationLevel[subject.educationLevel]},
                  ${subject.visionDefect});
                SELECT * FROM @inserted;`

    const result = await this.mssqlDB.request().query(query);
    return result.recordset[0];
  }

  async saveSubjectToCassandra(subject) {
    let query = `INSERT INTO subject (id, age, educationLevel, sex, visionDefect)
    VALUES (now(), ${subject.age}, '${subject.educationLevel}', '${subject.sex}', ${!!subject.visionDefect});`
    await this.cassandraDB.execute(query);
    return;
  }

  async saveSubjectToMongo(subject) {
    const newSubject = new Subject(subject);
    await newSubject.save();
    return newSubject;
  }

  async editSubjectInMssql(subject) {
    let query = `UPDATE Subject SET 
    Age=${subject.age}, 
    SexId=${sex[subject.sex]},
    EducationLevelId=${educationLevel[subject.educationLevel]},
    VisionDefect=${subject.visionDefect}
    WHERE Id=${subject.id}
    SELECT * FROM Subject WHERE Id=${subject.id};`;

    const result = await this.mssqlDB.request().query(query);
    return result.recordset[0];
  }

  async editSubjectInCassandra(subject) {
    let query = `UPDATE subject SET 
                age=${subject.age},
                sex='${subject.sex}',
                educationLevel='${subject.educationLevel}',
                visionDefect=${!!subject.visionDefect}
                WHERE id=${subject.id};`;

    await this.cassandraDB.execute(query);
    query = `SELECT * FROM subject WHERE id=${subject.id};`;

    const result = await this.cassandraDB.execute(query);
    return result.rows[0];
  }

  async editSubjectInMongo(subject) {
    const updated = await Subject.findByIdAndUpdate(
      { _id: subject.id },
      subject,
      { new: true }
    );
    return updated;
  }

  async deleteSubjectFromMssql(id) {
    const query = `DELETE FROM Subject WHERE Id=${id};`;
    await this.mssqlDB.request().query(query);
  }

  async deleteSubjectFromCassandra(id) {
    const query = `DELETE FROM subject WHERE id=${id};`;
    return await this.cassandraDB.execute(query);
  }

  async deleteSubjectFromMongo(id) {
    return await Subject.deleteOne({ _id: id });
  }

  async getSubject(dbType, id) {
    switch (dbType) {
      case mssql: {
        return await this.getSubjectFromMssql(id);
      }
      case cassandra: {
        return await this.getSubjectFromCassandra(id);
      }
      case mongo: {
        return await this.getSubjectFromMongo(id);
      }
      default:
        return;
    };
  };

  async getSubjects(dbType) {
    switch (dbType) {
      case mssql: {
        return await this.getSubjectsFromMssql();
      }
      case cassandra: {
        return await this.getSubjectsFromCassandra();
      }
      case mongo: {
        return await this.getSubjectsFromMongo();
      }
      default:
        return;
    };
  };

  async saveSubject(dbType, subject) {
    switch (dbType) {
      case mssql: {
        return await this.saveSubjectToMssql(subject);
      }
      case cassandra: {
        return await this.saveSubjectToCassandra(subject);
      }
      case mongo: {
        return await this.saveSubjectToMongo(subject);
      }
      default:
        return;
    };
  };

  async editSubject(dbType, subject) {
    switch (dbType) {
      case mssql: {
        return await this.editSubjectInMssql(subject);
      }
      case cassandra: {
        return await this.editSubjectInCassandra(subject);
      }
      case mongo: {
        return await this.editSubjectInMongo(subject);
      }
      default:
        return;
    };
  };

  async deleteSubject(dbType, id) {
    switch (dbType) {
      case mssql: {
        return await this.deleteSubjectFromMssql(id);
      }
      case cassandra: {
        return await this.deleteSubjectFromCassandra(id);
      }
      case mongo: {
        return await this.deleteSubjectFromMongo(id);
      }
      default:
        return;
    };
  }

};

export default SubjectDAL;

