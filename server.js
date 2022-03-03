const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const config = require("config");
const fs = require("fs");
const gm = require("gm").subClass({ imageMagick: true });

const { spawnSync } = require("child_process");

const configurationFilePath = "~/.oci/config";
const profile = "DEFAULT";

// create application/json parser
var jsonParser = bodyParser.json();

// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false });

const app = express();

app.post("/test", jsonParser, (req, res) => {
  console.log("test Start");

  let fileName = "./img/dilip-pan.jpeg";
  let watermark = "./img/approved-stamp.png";
  let dim = {
    x0: 0.36333333333333334,
    y0: 0.39893617021276595,
    x1: 0.53,
    y1: 0.46808510638297873,
  };

  // gm(fileName).size((err,value)=>{
  //   if(!err){
  //     let w = value.width;
  //     let h = value.height;
  //     gm(fileName).drawRectangle(dim.x0*w,dim.y0*h,dim.x1*w,dim.y1*h).write("./img/output/1.jpeg", (err) => {
  //       if(!err)
  //         console.log("Done");
  //       else
  //       console.log(err);
  //     })
  //   }

  //   else
  //   console.log(err)
  // })

  // gm.command("composite").in("-gravity", "center").in(fileName).in(watermark).write("./img/output/1.jpeg", (err) => {
  //         if(!err)
  //           console.log("Done");
  //         else
  //         console.log(err);
  //       })
  //   console.log("test End");

  // gm()
  //  //.in('-page', '+0+0')
  //  .in(fileName)
  //  //.in('-page', '+10+20') // location of smallIcon.jpg is x,y -> 10, 20
  //  .in(watermark)
  //  .mosaic().gravity("Center")
  //  .write("./img/output/1.jpeg", function (err) {
  //     if (!err)
  //     console.log("Done")
  //     else
  //     console.log(err);
  //  });
  // gm(fileName).fill('#ffffff')
  //             .font('Arial', 18,"red") // I didn't wanted to play with fonts, so used normal default thing (:
  //             .drawText(0, 0, "APPROVED","Center").highlightColor("red").write("./img/output/1.jpeg", function (err) {
  //                   if (!err)
  //                   console.log("Done")
  //                   else
  //                   console.log(err);
  //                });

  gm(fileName).size((err, value) => {
    if (!err) {
      let w = value.width;
      let h = value.height;

      gm(fileName)
        .composite(watermark)
        .geometry("+" + w / 2 + "+" + h / 2)
        .write("./img/output/1.jpeg", function (err) {
          if (!err) console.log("Done");
          else console.log(err);
        });
    }
  });
});

//Test Method for testing CLI call
app.post("/test1", jsonParser, (req, res) => {
  console.log("Start");

  const ls = spawnSync("ls", ["-la"], { encoding: "utf8" });

  if (ls.stderr) {
    console.log(ls.stderr);
  }
  console.log(ls.stdout);
  console.log("end");
  getAuthToken();
});

//Webhook Notification
app.post("/notify", jsonParser, (req, res) => {
  console.log("Inside Notify");

  const accessToken = config.get("accessToken");

  let contentId, documentName;

  if (req.body.event.name === "DIGITALASSET_CREATED") {

    contentId = req.body.entity.id;
    documentName = req.body.entity.name;
    console.log("New Asset Payload Content ID:" + contentId);
    downloadContent({
      response: res,
      token: accessToken,
      contentId: contentId,
      documentName: documentName,
    },extractData);
  } else if(req.body.event.name === "DIGITALASSET_APPROVED") {
    contentId = req.body.entity.id;
    documentName = req.body.entity.name;
    console.log("Approved Asset Payload Content ID:" + contentId);
    downloadContent({
      response: res,
      token : accessToken,
      contentId : contentId,
      documentName: documentName
    },watermarkContent);
  }
  else {
    res.send("Invalid payload to process");
  }
  //Get content ID from payload
  //const contentId = "CONT279C26F21D4646BE86103D81AF2919E6";

  //Get Access Token

  //Call Content Item details
  //downloadContent(res,accessToken, contentId);
  //updateContent(res, accessToken, null, contentId);

  //   const contentDetails = await getContentDetails(accessToken,contentID)
  //   console.log("Got Access Token2: "+ accessToken);
  //console.log(req.body.name);
});

app.get("/", (req, res) => {});

app.get("/vision", (req, res) => {
  res.send("Successful response.");
});

function getAuthToken() {
  console.log("Start of getAuthToken");
  var reqData =
    "grant_type=client_credentials&scope=https://NishuOCM-sehubjapacprod.cec.ocp.oraclecloud.com/urn:opc:cec:all";
  var reqToken = axios
    .request({
      url: "/oauth2/v1/token",
      method: "post",
      baseURL:
        "https://idcs-ca14323331894ee3834e06f9f910d8f6.identity.oraclecloud.com",
      auth: {
        username: "dacc864420804b9998335148912376d3",
        password: "f3c6e97e-3c0f-46a0-851b-bccf7586848c",
      },
      data: reqData,
      headers: {
        Host: "idcs-ca14323331894ee3834e06f9f910d8f6.identity.oraclecloud.com",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    })
    .then(function (response) {
      console.log(response.data.access_token);
    })
    .catch((err) => {
      console.log("Error occor" + err);
    });
}

function getContentDetails(token, contentId) {
  reqToken = axios
    .request({
      url: `${config.get("apiURL")}items/${contentId}`,
      method: "get",
      baseURL: config.get("baseURL"),
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((res) => {
      console.log("Got content Details" + res);
    })
    .catch((err) => {
      console.log("Error content Details" + err);
    });
}
async function watermarkContent(params){
console.log("inside watermark Start");
  //generate watermark
  let fileName = params.fileName;
  gm(fileName).size((err, value) => {
    if (!err) {
      let w = value.width;
      let h = value.height;

      gm(fileName)
        .composite("./img/approved-stamp.png")
        .geometry("+" + w / 2 + "+" + h / 2)
        .write(fileName, function (err) {
          if (!err) {
            console.log("Watermark Generated!!!");
            updateItem(params,'Y');
        }
          else console.log(err);
        });
    }
  });

  //upload content
  

}

async function downloadContent(params,callback) {
  //res, token, contentId, documentName
  console.log("Inside downloadContent with params:" + params);
  const contentURL =
    config.get("apiURL") + "assets/" + params.contentId + "/native";
  console.log("API URL:" + contentURL);

  const header = {
    headers: {
      Authorization: `Bearer ${params.token}`,
      "Content-Type": "application/json",
    },
    responseType: "stream",
  };

  await axios
    .get(contentURL, header, { responseType: "stream" })
    .then((response) => {
      console.log("Inside downloadContent: Got response");
      resContentType = response.headers["content-type"];

      if (resContentType.indexOf("image/") > -1) {
        var ext = resContentType.replace("image/", "");
        fileName = params.contentId + "." + ext;
        console.log("FileName:" + fileName);
        var writer = fs.createWriteStream(fileName);
      } else {
        console.log("Content is not image");
        res.status(400).send({
          Error: "Content is not an image!",
        });
        return;
      }
      var stream = response.data.pipe(writer);
      stream.on("finish", () => {
        console.log("Inside Dwonload Content: complete writting");
        params["fileName"] = fileName;
        callback(params);
      });
      //imageNode.src = imgUrl
    })
    .catch((error) => {
      console.log(error);
      res.status(400).send({
        Error: error,
      });
      return;
    });
}

async function extractData(params) {
  //res, token, fileName, contentId, documentName
  console.log("Inside extract Data with params:" + params);

  const aivision = require("oci-aivision");
  const common = require("oci-common");
  let fileContent = fs.readFileSync(params.fileName, { encoding: "base64" });

  const provider = new common.ConfigFileAuthenticationDetailsProvider(
    configurationFilePath,
    profile
  );

  // Create a service client

  const client = new aivision.AIServiceVisionClient({
    authenticationDetailsProvider: provider,
  });
  // Create a request and dependent object(s).
  const analyzeDocumentDetails = {
    features: [
      {
        featureType: "TEXT_DETECTION",
      },
    ],
    document: {
      source: "INLINE",
      data: fileContent,
    },
    compartmentId:
      "ocid1.tenancy.oc1..aaaaaaaajuup5vkjzj2r7afj3htxigxyiqgqosgf4okae5ubht36tytbtfya",
    outputLocation: {
      namespaceName: "axbudmldsedi",
      bucketName: "vision_bucket",
      prefix: "process-",
    },
    language: aivision.models.DocumentLanguage.Eng,
    documentType: aivision.models.DocumentType.UnknownValue,
  };
  const analyzeDocumentRequest = {
    analyzeDocumentDetails: analyzeDocumentDetails,
  };
  // Send request to the Client.
  const analyzeDocumentResponse = client.analyzeDocument(
    analyzeDocumentRequest
  );
  console.log("Inside extractData:Call function");
  analyzeDocumentResponse.then(
    function (value) {
      console.log("This is success");
      let arrData = [];
      if (value.analyzeDocumentResult.documentMetadata.pageCount > 0) {
        let pages = value.analyzeDocumentResult.pages;

        for (i = 0; i < pages.length; i++) {
          let words = pages[i].words;
          for (w = 0; w < words.length; w++) {
            arrData.push({
              text: words[w].text,
              x0: words[w].boundingPolygon.normalizedVertices[0].x,
              y0: words[w].boundingPolygon.normalizedVertices[0].y,
              x1: words[w].boundingPolygon.normalizedVertices[2].x,
              y1: words[w].boundingPolygon.normalizedVertices[2].y,
            });
          }
        }
      }
      for (i = 0; i < arrData.length; i++) {
        console.log("Index -" + i + " : " + arrData[i].text);
      }
      // console.log(
      //   "Document Type :" +
      //   arrData[13] +
      //     " " +
      //     arrData[14] +
      //     " " +
      //     arrData[15] +
      //     " " +
      //     arrData[16]
      // );
      // console.log("Name :" + arrData[21] + " " + arrData[22]);
      // console.log("Father's Name :" + arrData[28] + " " + arrData[29]);
      // console.log("Date of Birth :" + arrData[38]);
      // console.log("PAN Number :" + arrData[17]);
      params["data"] = arrData;
      redactContent(params);
    },
    function (error) {
      console.log("This is error" + error);
      console.log(error);
    }
  );
}

async function redactContent(params) {
  //res, token, arrData, contentId, documentName
  console.log("Inside redactContent with param:" + params);

  gm(params.fileName).size((err, value) => {
    if (!err) {
      let w = value.width;
      let h = value.height;
      let dim = getDocumentData(params.data).region;
      gm(params.fileName)
        .drawRectangle(dim.x0 * w, dim.y0 * h, dim.x1 * w, dim.y1 * h)
        .write(params.fileName, (err) => {
          if (!err) {
            console.log("Done");
            updateItem(params);
          } else console.log(err);
        });
    }
  });
}

async function updateItem(params,fileOnly ='N') { //fileOnly Y or N, default is N
  console.log("Inside updateItem with param:" + params);

  const updateURL =  config.get("apiURL") + "items/" + params.contentId;
  const FormData = require("form-data");

  // Create a new form instance
  const form = new FormData();

  console.log(updateURL);
  
  //console.log(tags);
  if(fileOnly === 'N'){
  let documentData = getDocumentData(params.data);
  var payload = {
    id: params.contentId,
    type: "KYC-Asset",
    typeCategory: "DigitalAssetType",
    repositoryId: config.get("repoId"),
    name: params.documentName,
    fields: {
      document_id: documentData.documentId,
      customer_name: documentData.name,
      document_type: getDocumentType(params.data),
    },
  };
  form.append("item", JSON.stringify(payload));
}
  console.log("Before Form creation" + __dirname + params.fileName);
  const file = fs.readFileSync(params.fileName);

  console.log(JSON.stringify(payload));

  //form.append("item", JSON.stringify(payload));
  form.append("file", file,{filename : params.fileName, "Content-Type" : "image/jpeg"});

  var header = {
    headers: {
      "Authorization" : `Bearer ${params.token}`,
      ...form.getHeaders(),
      "X-Requested-With": "XMLHttpRequest"
    },
  };
  //console.log(contentUrl);
  //console.log(payload);
  console.log("calling service");
  await axios
    .put(updateURL, form, header)
    .then(function (response) {
      console.log(response);

      // Fs.unlink(fileName, (err) => {
      //     if (err) throw err;
      //     console.log('successfully deleted '+fileName);
      // });
      params.response.sendStatus(200);
    })
    .catch(function (error) {
      console.log("Error occor"+error );
      console.log(JSON.stringify(error));
      console.log(error);
      console.log(error.response);
    });
}

function getDocumentType(arrData) {
  if (arrData && arrData[4].text == "TAX") {
    console.log("Identified as PAN Card");
    return "PAN Card";
  }
  if (arrData && arrData[5].text == "AADHAR") {
    console.log("Identified as Aadhar Card");
    return "Aadhar Card";
  }
}

function getDocumentData(arrData) {
  let documentType = getDocumentType(arrData);
  if ((documentType = "PAN Card")) {
    console.log("Identified as PAN Card");
    return getPANData(arrData);
  }
  if (documentType == "Aadhar Card") {
    console.log("Identified as Aadhar Card");
    return;
  }
  console.log("Unable to identify document");
  return;
}

function getPANData(arrData) {
  console.log("inside get PAN Data");
  let documentId, name, region;
  for (i = 0; i < arrData.length; i++) {
    //Get PAN Card Number
    if (arrData[i].text == "Number") {
      //We are using "Number" because sometime Card doesn't get extracted well
      documentId = arrData[i + 2].text;
      region = {
        x0: arrData[i + 2].x0,
        y0: arrData[i + 2].x0,
        x1: arrData[i + 2].x1,
        y1: arrData[i + 2].y1,
      };
    }
    if (arrData[i].text == "Name") {
      name = arrData[i + 1].text + " " + arrData[i + 2].text;
      break;
    }
  }
  console.log("Document ID:" + documentId + " Name:" + name);
  return { documentId: documentId, name: name, region: region };
}

app.listen(config.get("server.port"), () =>
  console.log("Example app is listening on port" + config.get("server.port"))
);
