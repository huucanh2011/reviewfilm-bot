"use strict";
const PAGE_URL = process.env.PAGE_URL;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
// Imports dependencies and set up http server
const axios = require("axios"),
  express = require("express"),
  body_parser = require("body-parser"),
  app = express().use(body_parser.json()); // creates express http server

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log("webhook is listening"));

// Accepts POST requests at /webhook endpoint
app.post("/webhook", (req, res) => {
  // Parse the request body from the POST
  let body = req.body;

  // Check the webhook event is from a Page subscription
  if (body.object === "page") {
    body.entry.forEach(function (entry) {
      // Gets the body of the webhook event
      let webhook_event = entry.messaging[0];
      console.log(webhook_event);

      // Get the sender PSID
      let sender_psid = webhook_event.sender.id;
      console.log("Sender ID: " + sender_psid);

      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (webhook_event.message) {
        // handleMessage(sender_psid, webhook_event.message);
      } else if (webhook_event.postback) {
        handlePostback(sender_psid, webhook_event.postback);
      }
    });
    // Return a '200 OK' response to all events
    res.status(200).send("EVENT_RECEIVED");
  } else {
    // Return a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});

// Accepts GET requests at the /webhook endpoint
app.get("/webhook", (req, res) => {
  /** UPDATE YOUR VERIFY TOKEN **/
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  // Parse params from the webhook verification request
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      // Respond with 200 OK and challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

function handleMessage(sender_psid, received_message) {
  let response;

  // Checks if the message contains text
  if (received_message.text) {
    // Create the payload for a basic text message, which
    // will be added to the body of our request to the Send API
    response = {
      text: `You sent the message: "${received_message.text}". Now send me an attachment!`,
    };
  } else if (received_message.attachments) {
    // Get the URL of the message attachment
    let attachment_url = received_message.attachments[0].payload.url;
    response = {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [
            {
              title: "Is this the right picture?",
              subtitle: "Tap a button to answer.",
              image_url: attachment_url,
              buttons: [
                {
                  type: "postback",
                  title: "Yes!",
                  payload: "yes",
                },
                {
                  type: "postback",
                  title: "No!",
                  payload: "no",
                },
              ],
            },
          ],
        },
      },
    };
  }

  // Send the response message
  callSendAPI(sender_psid, response);
}

function handlePostback(sender_psid, received_postback) {
  let response;
  // Get the payload for the postback
  let payload = received_postback.payload;

  if (payload === "get_started") {
    response = {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "Review film xin chào bạn, bạn cần gì?",
          buttons: [
            {
              type: "postback",
              title: "Phim mới nhất",
              payload: "get_new_film",
            },
            {
              type: "postback",
              title: "Phim hot",
              payload: "get_hot_film",
            },
            {
              type: "postback",
              title: "Phim xem nhiều",
              payload: "get_popular_film",
            },
          ],
        },
      },
    };
  }

  if (payload === "get_new_film") {
    const url = `${PAGE_URL}/api/phim/new`;
    const { data, status } = await callerAPI(url);
    if (data && status === 200) {
      if (data.length > 0) {
        let elements = fetchGeneric(data);
        response = {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: elements,
            },
          },
        };
      } else {
        response = {
          text: "Không tìm thấy kết quả!",
        };
      }
    }
  }

  if (payload === "get_hot_film") {
    const url = `${PAGE_URL}/api/phim/hot`;
    const { data, status } = await callerAPI(url);
    if (data && status === 200) {
      if (data.length > 0) {
        let elements = fetchGeneric(data);
        response = {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: elements,
            },
          },
        };
      } else {
        response = {
          text: "Không tìm thấy kết quả!",
        };
      }
    }
  }

  if (payload === "get_popular_film") {
    const url = `${PAGE_URL}/api/phim/popular`;
    const { data, status } = await callerAPI(url);
    if (data && status === 200) {
      if (data.length > 0) {
        let elements = fetchGeneric(data);
        response = {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: elements,
            },
          },
        };
      } else {
        response = {
          text: "Không tìm thấy kết quả!",
        };
      }
    }
  }

  // Send the message to acknowledge the postback
  callSendAPI(sender_psid, response);
}

function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    recipient: {
      id: sender_psid,
    },
    message: response,
  };

  let url = `https://graph.facebook.com/v2.6/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

  // Send the HTTP request to the Messenger Platform
  axios.post(url, request_body);
}

const fetchGeneric = (data = []) => {
  let output = [];
  let len = data.length;

  for (let i = 0; i < len; i++) {
    output.push({
      title: data[i].ten_chinh,
      image_url: `${PAGE_URL}/upload/phim/${data[i].anh_poster}`,
      buttons: [
        {
          type: "web_url",
          url: `${PAGE_URL}/movie/${data[i].slug}`,
          title: "Xem chi tiết",
        },
        {
          type: "postback",
          title: "Xem phim khác",
          payload: "get_started",
        },
      ],
    });
  }

  return output;
};

const callerAPI = async (url, method = "GET", data = {}) => {
  return new Promise((reslove, reject) => {
    axios({
      method: method,
      url: url,
      data: data,
      responseType: "json",
      headers: {
        "Content-type": "application/json",
      },
    })
      .then((res) => {
        reslove(res);
      })
      .catch((err) => {
        reject(err.response);
      });
  });
};