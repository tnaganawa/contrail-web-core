/*
 * Copyright (c) 2014 Juniper Networks, Inc. All rights reserved.
 */

/* This file uses jobProcess.xml and creates the file jobsCb.api.js */
var fs = require('fs'),
    xml2js = require('xml2js');

var jobLists = [];

function parseJobListFile (result, fileToGen, cb)
{
  var itemList = result['jobLists']['item'];
  var len = 0;
  var jobCbStr = "";
  var regUrlStr = "\n";
  var commentStr = "";
  var method;
  var jobChannel = "";
  var jobDependStr = "";
  var dependFound = false;

  commentStr += "/*\n";
  commentStr += " * Copyright (c) 2014 Juniper Networks, Inc. All rights reserved.\n";
  commentStr += " */\n";
  commentStr += "\n";
  var date = new Date();
  commentStr +=  "/* This file is automatically generated from the jobProcess.xml at\n"
  commentStr += "   " + date;
  commentStr += "\n";
  commentStr += "   Please do not edit this file."
  commentStr += "\n"
  commentStr += " */";
  commentStr += "\n";
  commentStr += "\n";

  jobCbStr += commentStr;
 
  var requiresList = result['jobLists']['require'];
  var len = requiresList.length;
  for (var i = 0; i < len; i++) {
      var splitter = (requiresList[i]['path']).toString().split('+');
      if (i == 0) {
         if ((requiresList[i] == null) || (null == requiresList[i]['define']) ||
             (null == requiresList[i]['path'])) {
             assert(0);
         }
         jobCbStr += 'var ' + requiresList[i]['define'] + ' = require(';
         if (splitter.length <= 1) {
            jobCbStr += "'" + requiresList[i]['path'] + "')\n";
         } else {
            jobCbStr += requiresList[i]['path'] + ")\n";
         }
         continue;
      }
      jobCbStr += '  , ' + requiresList[i]['define'] + ' = require(';
      if (splitter.length <= 1) {
        jobCbStr += "'" + requiresList[i]['path'] + "')\n";
      } else {
        jobCbStr += requiresList[i]['path'] + ")\n";
      }
  }

  jobCbStr += "  ;\n";
  jobCbStr += "\n";
  jobCbStr += "\n";
  jobCbStr += "if (!module.parent) {";
  jobCbStr += "\n  console.log(\"Call main app through 'node app'\");";
  jobCbStr += "\n  process.exit(1);";
  jobCbStr += "\n}";
  jobCbStr += "\n";
  jobCbStr += "var jobsCb = module.exports;";
  jobCbStr += "\n";
  jobCbStr += "\n";
  jobCbStr += "\nvar defMaxActiveJobs = 10;";
  jobCbStr += "\nvar maxActiveJobs = parseJobsReq.config.maxActiveJobs || defMaxActiveJobs;\n";
  jobCbStr += "\n";

  jobChannel += "\n  /* Publish the data on pubChannel And Save the data key as \n";
  jobChannel +=   "     saveChannelKey\n";
  jobChannel +=   "   */";

  jobCbStr += "jobsCb.jobsProcess = function() {";

  len = 0;
  if (null != itemList) {
    len = itemList.length;
  }
  for (var i = 0; i < len; i++) {
    jobCbStr +=   "\n  parseJobsReq.registeredJobs.push('" +
        itemList[i]['jobName'] + "');";
    jobCbStr +=   "\n  parseJobsReq.jobsApi.jobs.process('";
    jobCbStr += itemList[i]['jobName'] + "', maxActiveJobs, function(job, done) {";
    jobCbStr += jobChannel;
    jobCbStr += "\n";
    jobCbStr += "    var jobStartTime = parseJobsReq.commonUtils.getCurrentTimestamp();\n";
    jobCbStr += "    job.data['jobStartTime'] = jobStartTime;\n";
    jobCbStr += "    jobsProcess." + itemList[i]['callback'] + "(\n";
    jobCbStr += "        job.data.taskData.pubChannel,\n";
    jobCbStr += "        job.data.taskData.saveChannelKey,\n";
    jobCbStr += "        job.data, done);";
    jobCbStr += "\n  });\n";
    if (itemList[i]['requireJob']) {
        dependFound = true;
        jobDependStr += "    parseJobsReq.jobsApi.jobListenerReadyQEvent.on(" +
            "'" + itemList[i]['jobName'] + '@' + itemList[i]['requireJob'] + "'" + ",\n" +
            "       function(dependData, pubChannel, saveChannelKey, done) {\n";
        jobDependStr += "       var storedData =" +
            "parseJobsReq.jobsApi.getDataFromStoreQ(pubChannel);\n";
        jobDependStr += "       /* Now call the API to do the main work */\n";
        jobDependStr += "       jobsProcess.mainJob" + itemList[i]['callback'] + "(\n" +
                        "           pubChannel, saveChannelKey, dependData, storedData.data," +
                        " storedData.jobData, done);\n";
        jobDependStr += "    });\n";
    }
  }
  jobCbStr += "}\n";
  jobCbStr += "\njobsCb.addjobListenerEvent = function() {\n";
  if (true === dependFound) {
      jobCbStr += jobDependStr;
  }
  jobCbStr += "}";

  fs.writeFile(fileToGen, jobCbStr, function(err) {
    if (err) throw err;
    cb(err);
    console.log("Done, creating file: " + fileToGen);
  });
}

/*
var args = process.argv.slice(2);
var parser = new xml2js.Parser();
parser.addListener('end', function(result) {
    if ('base' == args[0]) {
        fileToGen = __dirname + '/../serverroot/jobs/core/jobsCb.base.api.js';
    } else {
        fileToGen = __dirname + '/../serverroot/jobs/core/jobsCb.api.js';
    }
    parseJobListFile(result, fileToGen);
    console.log("Done, creating file: " + fileToGen);
});

var parseFile = null;
if ('base' == args[0]) {
    parseFile = '../xml/jobProcessBase.xml';
} else {
    parseFile = '../xml/jobProcess.xml';
}

fs.readFile(__dirname + '/' + parseFile, function(err, data) {
    parser.parseString(data);
});
*/
exports.parseJobListFile = parseJobListFile;

