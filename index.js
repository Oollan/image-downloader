"use strict";

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const rp = require("request-promise");
const parse = require("html-dom-parser");

const url = process.argv[2] || "https://www.mako.co.il/"; // First argument
const outputFolder = path.join(__dirname, process.argv[3] || "output"); // Second argument
const imagesUrls = []; // Array of images urls

const findImgs = (html) => {
  for (const elem of html) {
    elem.name === "img" && // Check if element is an image
      elem.attribs.src.startsWith("http") && // Validates that the url starts with http
      imagesUrls.push(elem.attribs.src); // Push to array the element
    elem.children !== undefined && findImgs(elem.children); // recurse if element got children
  }
  // Base case failure
  if (!imagesUrls.length) return "Cannot detect images";
  // Return filled array
  else return imagesUrls;
};

const downloadFile = async (url) => {
  const fileName = url.split("/").pop();
  const localFilePath = path.resolve(outputFolder, fileName);
  // Call for Axios to download the images
  const response = await axios({
    method: "GET",
    url: url,
    responseType: "stream",
  }).catch((err) => err && console.error(err));
  // Store the images at the output folder
  response.data.pipe(fs.createWriteStream(localFilePath));
};

const generateImgElement = () => {
  const imgElements = [];
  imagesUrls.forEach((imageUrl) =>
    // Generates array full of elements
    imgElements.push(
      `<div>
        <img src="${imageUrl.split("/").pop()}" style="max-width: 120px">
        <div>${imageUrl}</div>
      </div>`
    )
  );
  // Returning array as string
  return imgElements.join("\r\n\t\t\t");
};

// Create directory to store the images
fs.mkdir(outputFolder, { recursive: true }, (err) => err && console.error(err));

// Scrap the document file from the given url and apply functions
rp(url)
  .then((html) => {
    const imagesInHTML = findImgs(parse(html));

    if (imagesUrls.length)
      for (const image of imagesInHTML) downloadFile(image);

    const imgElements = imagesUrls.length ? generateImgElement() : imagesInHTML;

    // Writes the index.html in the output folder
    fs.writeFile(
      `${outputFolder}/index.html`,
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Image Grid</title>
        </head>
        <body>
          ${imgElements}
        </body>
        <style>
          body {
            margin: 5%;
            display: grid;
            grid-template-columns: auto auto;
          }
        </style>
      </html>`,
      (err) => err && console.error(err)
    );
    console.log(`index.html is ready!\n ${outputFolder}/index.html`);
  })
  .catch((err) => err && console.error(err));
