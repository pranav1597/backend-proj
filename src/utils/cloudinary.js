import {v2 as cloudinary} from 'cloudinary';

import fs from 'fs'

const {CLOUDINARY_CLOUD_NAME,CLOUDINARY_API_KEY,CLOUDINARY_API_SECRET} = process.env

cloudinary.config({ 
  cloud_name: CLOUDINARY_CLOUD_NAME, 
  api_key: CLOUDINARY_API_KEY, 
  api_secret: CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try{
        if(!localFilePath) {
            console.log("Couldn't find the path")
            return null
        }
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        // console.log("file is uploaded on cloudinary", response.url)
        fs.unlinkSync(localFilePath)

        return response

    } catch(error){
        fs.unlinkSync(localFilePath)
        //remove the saved temp file as the upload got failed

        return null
    }
}

export default uploadOnCloudinary