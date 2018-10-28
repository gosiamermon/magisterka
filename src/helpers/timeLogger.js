import fs from 'fs';

export default (start, end, database, method) => {
  fs.open("time_efficiency.tsv", 'r', function (err, fd) {
    if (err) {
      fs.writeFile("time_efficiency.tsv", '', function (err) {
        if (err) {
          console.log(err);
          return;
        }
        appendToFile(start, end, database, method);
      });
    } else {
      console.log("The file exists!");
      appendToFile(start, end, database, method);
    }
  });

};

function appendToFile(start, end, database, method) {
  const time = (end - start) / 1000;
  const write = `${database}  ${method} ${time}\r\n`;
  fs.appendFile("time_efficiency.tsv", write, function (err) {
    if (err) {
      return console.log(err);
    }
    console.log("Efficiency saved!");
  });
}