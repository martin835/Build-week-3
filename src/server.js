import express from "express";
import mongoose from "mongoose";
import listEndpoints from "express-list-endpoints";
import cors from "cors";

import postRouter from "./services/post/index.js";
import experiencesRouter from "./services/experiences/index.js";
import profileRouter from "./services/profile/index.js";
import friendsRouter from "./services/friends/index.js";
import messagesRouter from "./services/messages/index.js";


import {
  badRequestHandler,
  notFoundHandler,
  genericErrorHandler,
} from "./errorHandler.js";




const server = express();
const port = process.env.PORT;

//***********************************Middlewares*******************************************************/

server.use(cors());
server.use(express.json());

//***********************************Endpoints*********************************************************/
server.use("/posts", postRouter);
server.use("/profile", [profileRouter, experiencesRouter]);
server.use("/friend", friendsRouter);
server.use("/message", messagesRouter);





//***********************************Error handlers****************************************************/
server.use(badRequestHandler);
server.use(notFoundHandler);
server.use(genericErrorHandler);

mongoose.connect(process.env.MONGO_CONNECTION);

mongoose.connection.on("connected", () => {
  console.log("👌 Connected to Mongo!");

  server.listen(port, () => {
    console.table(listEndpoints(server));
    console.log(`🚀 Server listening on port ${port}`);
  });
});
