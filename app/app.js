var express = require("express");
var bodyParser = require('body-parser')
var app = express();
var path = require('path');
var AWS = require('aws-sdk');
var s3 = new AWS.S3();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.get("/", function(req, res){
    res.sendFile(path.join(__dirname + "/../views/app.html"));
});

//Returns list of files for ip address
app.get("/api/files", function(req, res){
    //All files in bucket are prefaced with ip address of uploader
    var ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
    console.log(ip);
    var params = {
        Bucket: 'localshare',
        Prefix: ip
    }
    s3.listObjectsV2(params, function(err, data){
        if (err) console.warn(err);
        else console.log(data);
        data.Contents.map(function(file){
            //Strip IP address form start of filename
            file.Key = file.Key.replace(ip+"/", "");
            //Convert filesize to readable format
            var fileSizeInBytes = file.Size;
            var i = -1;
            var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
            do {
                fileSizeInBytes = fileSizeInBytes / 1024;
                i++;
            } while (fileSizeInBytes > 1024);
            file.Size = Math.max(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
            return file;
        })
        //First item returned will be folder - we don't want to return that
        data.Contents.shift();
        res.send(data);
    });
});

//Pass download link to client for downloading file
app.get("/api/files/:filename", function(req, res) {
    var ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
    var params = {Bucket: "localshare", Key: ip + "/" + req.params.filename};
    s3.getSignedUrl('getObject', params, function(err, url){
        res.redirect(url);
    });
});

//Pass upload link to client for uploading file.  Filesize must be included before upload, and uploaded filesize must match.
app.post("/api/files", function(req, res){
    var ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
    console.log(req.body);
    var params = {Bucket: "localshare", Key: ip + "/" + req.body.filename};
    s3.getSignedUrl('putObject', params, function(err, url){
        console.log(url)
        console.log(err)
        res.send(url);
    });
});

app.listen(process.env.PORT, function(){
    console.log("Listneing on " + process.env.IP + ":" + process.env.PORT);
});