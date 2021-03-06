import express, { application } from "express";
import createError from "http-errors";
import profileModel from "./model.js";
import { getPDFReadableStream } from "./pdf-tools.js";
import { pipeline } from "stream";
import axios from "axios";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";


const profileRouter = express.Router();

const cloudinaryUploader = multer({
  storage: new CloudinaryStorage({
    cloudinary, // search automatically for process.env.CLOUDINARY_URL (looking for Cloudinary credentials)
    params: {
      folder: "usersPics",
    }, limits: { fileSize: 3145728 }
  }),
}).single("image");

profileRouter.get("/", async (req, res, next) => {
  try {
    const profiles = await profileModel.find().populate({ path: "friends", populate: { path: "recipient", select: "name surname title image" } }).populate({ path: "friends", populate: { path: "requester", select: "name surname title image" } })
    res.send(profiles);
  } catch (error) {
    next(error);
    console.log(error);
  }
});

profileRouter.post("/", async (req, res, next) => {
  try {
    const newProfile = new profileModel(req.body);

    const { _id } = await newProfile.save();
    res.status(201).send({ _id });
  } catch (error) {
    next(error);
    console.log(error);
  }
});

profileRouter.get("/:userId", async (req, res, next) => {
  try {
    const profile = await profileModel.findById(req.params.userId).populate({ path: "friends", populate: { path: "recipient", select: "name surname title image" } }).populate({ path: "friends", populate: { path: "requester", select: "name surname title image" } })
    if (profile) res.send(profile);
    else {
      next(createError(404, `user with id ${req.params.userId} not found!`));
    }
  } catch (error) {
    next(error);
    console.log(error);
  }
});

profileRouter.put("/:userId", async (req, res, next) => {
  try {
    const updatedProfile = await profileModel.findByIdAndUpdate(
      req.params.userId,
      req.body,
      { new: true, runValidators: true }
    );

    if (updatedProfile) {
      res.send(updatedProfile);
    } else {
      next(createError(404, `user with id ${req.params.userId} not found!`));
    }
  } catch (error) {
    next(error);
    console.log(error);
  }
});

profileRouter.delete("/:userId", async (req, res, next) => {
  try {
    const deletedProfile = await profileModel.findByIdAndDelete(
      req.params.userId
    );
    if (deletedProfile) {
      res.status(204).send();
    } else {
      next(createError(404, `user with id ${req.params.userId} not found!`));
    }
  } catch (error) {
    next(error);
    console.log(error);
  }
});

profileRouter.get("/:profileId/downloadPDF", async (req, res, next) => {
  try {
    const profile = await axios.get(
      "http://localhost:3001/profile/" + req.params.profileId,
      {
        responseType: "application/json",
      }
    );
    const experience = await axios.get(
      "http://localhost:3001/profile/" + req.params.profileId + "/experiences",
      {
        responseType: "application/json",
      }
    );

    const allExp = experience.data.map((exp) => [
      {
        text: exp.role,
        style: "subheader",
      },
      {
        text: exp.company,
        style: "subheader",
      },
      {
        text: exp.description,
        style: "subheader",
      },
      {
        text: exp.area,
        style: "subheader",
      },
    ]);

    const image = await axios.get(profile.data.image, {
      responseType: "arraybuffer",
    });

    allExp.unshift(["Role", "Company", "Description", "Area"]);

    const imageURLParts = profile.data.image.split("/");
    const fileName = imageURLParts[imageURLParts.length - 1];
    const [extension] = fileName.split(".");
    const base64 = image.data.toString("base64");
    const base64Image = `data:image/${extension};base64,${base64}`;

    res.setHeader("Content-Disposition", "attachment; filename=example.pdf"); // This header tells the browser to open the "save file on disk" dialog

    const source = getPDFReadableStream(
      profile.data.name + " " + profile.data.surname,
      profile.data.bio,
      allExp,

      base64Image
    );

    const destination = res;

    pipeline(source, destination, (err) => {
      console.log(err);
    });
  } catch (error) {
    next(error);
  }
});

profileRouter.post("/:userId/upload", cloudinaryUploader, async (req, res, next) => {
  try {
    const user = await profileModel.findByIdAndUpdate(
      req.params.userId,
      { image: req.file.path },
      { new: true }
    );

    if (user) {
      res.send("Uploaded on Cloudinary!");
    } else {
      next(createError(404, `user with id ${req.params.userId} not found!`));
    }
  } catch (error) {
    next(error);
  }
}
);

export default profileRouter;
