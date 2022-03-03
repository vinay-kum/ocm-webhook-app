const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const config = require("config");
const fs = require("fs");
const { spawnSync } = require("child_process");

const configurationFilePath = "~/.oci/config";
const profile = "DEFAULT";

// create application/json parser
var jsonParser = bodyParser.json();

// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false });

const app = express();

//Test Method for testing CLI call
app.post("/test", jsonParser, (req, res) => {
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
  
  let contentId,documentName;

  if (req.body.event.name === "DIGITALASSET_CREATED") {
    contentId = req.body.entity.id;
    documentName = req.body.entity.name;
    console.log("Payload Content ID:" +contentId)
    downloadContent(res, accessToken, contentId,documentName);

  } else {
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

function getContentDetails(token, contentID) {
  reqToken = axios
    .request({
      url: `${config.get("apiURL")}items/${contentID}`,
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

async function downloadContent(res, token, contentId,documentName) {
  console.log("Inside downloadContent");
  const contentURL = config.get("apiURL") + "assets/" + contentId + "/native/"+fileName;
  console.log("API URL:"+ contentURL);

  const header = {
    headers: {
      Authorization: `Bearer ${token}`,
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
        fileName = contentId + "." + ext;
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
        extractData(res, token, fileName, contentId,documentName);
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

async function extractData(res, token, fileName, contentId,documentName) {

  console.log("Inside extract Data");

  const aivision = require("oci-aivision");
  const common = require("oci-common");
  let fileContent = fs.readFileSync(fileName, { encoding: "base64" });
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
      let text;
      console.log("This is success");

      if (value.analyzeDocumentResult.documentMetadata.pageCount > 0) {
        let pages = value.analyzeDocumentResult.pages;

        for (i = 0; i < pages.length; i++) {
          let words = pages[i].words;
          for (w = 0; w < words.length; w++) {
            text = text + words[w].text + "\n";
          }
        }
      }
      let arrData = text.split("\n");
      for( i=0;i<arrData.length;i++){
          console.log("Index -"+i+" : "+arrData[i]);
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
      updateContent(res, token, arrData, contentId,documentName);
    },
    function (error) {
      console.log("This is error" + JSON.stringify(error));
      console.log(error);
    }
  );
}

function updateContent(res, token, arrData, contentId,documentName) {
  const updateURL = config.get("apiURL") + "items/" + contentId;
  console.log(updateURL);

  //console.log(tags);
  var payload = {
    id: contentId,
    type: "KYC Asset",
    typeCategory: "DigitalAssetType",
    repositoryId: "57277A5B27D54A158CF94E6C0B3386E4",
    name: documentName,
    fields: {
      document_id: arrData[13],
      customer_name: arrData[17] + " " + arrData[18],
      document_type: getDocumentType(arrData)
    },
  };

  var header = {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  };
  //console.log(contentUrl);
  //console.log(payload);
  axios
    .put(updateURL, payload, header)
    .then(function (response) {
      //console.log(response);

      // Fs.unlink(fileName, (err) => {
      //     if (err) throw err;
      //     console.log('successfully deleted '+fileName);
      // });
      res.sendStatus(200);
    })
    .catch(function (error) {
      console.log(error);
    });
}
function getDocumentType(arrData){
  if(arrData){
    if(arrData[9]== 'Permanent'){
      return 'PAN Card'
    }
  }else{
    return "Invalid";
  }
}

app.listen(config.get("server.port"), () =>
  console.log("Example app is listening on port" + config.get("server.port"))
);
