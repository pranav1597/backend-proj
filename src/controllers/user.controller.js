import asyncHandler from '../utils/asyncHandler.js';
import  ApiError  from '../utils/ApiError.js'
import { User } from '../models/user.model.js';
import uploadOnCloudinary from '../utils/cloudinary.js'
import ApiResponse from '../utils/ApiResponse.js';

const registerUser = asyncHandler( async (req, res) => {
   // get user details from frontend 
    //    validation is empty or not
    // user is already exists
    // check for images , check for avatar
    // upload them to cloudinary, check avatar
    // create user object = create entry in db
    // remove password anf refresh token field from response
    // check for user creation


    const { fullName, email, username, password } = req.body
    console.log("Email: ", email)
    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    )
        {
            throw new ApiError(400, "All fields are required")
        }
    
    const existedUser = User.findOne({
        $or: [ {username} , {email} ]
    })
    
    console.log(existedUser)
    
    if(existedUser){
        throw new ApiError(409, "User with username or password already exists")
    }
    
    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImagePath = req.files?.coverImage[0]?.path
    
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }
    
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImagePath)
    
    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        username: username.toLowerCase(),
        password,
        email,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""

    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while creating a user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User created successfully")
    )


} )


export default registerUser