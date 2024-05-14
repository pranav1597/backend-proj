import asyncHandler from '../utils/asyncHandler.js';
import  ApiError  from '../utils/ApiError.js'
import { User } from '../models/user.model.js';
import uploadOnCloudinary from '../utils/cloudinary.js'
import ApiResponse from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken'


const generateAccessandRefreshToken = async(userId) => {
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch(error) {
        throw new ApiError(500,"Something went wrong while generating access token  and refresh token")
    }
}





// for registering user
const registerUser = asyncHandler( async (req, res) => {
   // get user details from frontend 
    //    validation is empty or not
    // user is already exists
    // check for images , check for avatar
    // upload them to cloudinary, check avatar
    // create user object = create entry in db
    // remove password and refresh token field from response
    // check for user creation


    const { fullName, email, username, password } = req.body
    // console.log("Email: ", email)
    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    )
        {
            throw new ApiError(400, "All fields are required")
        }
    
    const existedUser = await User.findOne({
        $or: [ {username} , {email} ]
    })
    
    
    if(existedUser){
        throw new ApiError(409, "User with username or password already exists")
    }
    
    const avatarLocalPath = req.files?.avatar[0]?.path
    // console.log("avatarLocalPath", avatarLocalPath)
    // const coverImagePath = req.files?.coverImage[0]?.path
    
    let coverImagePath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImagePath = req.files.coverImage[0].path
    }



    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }
    
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    console.log("Avatar ", avatar)
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

// for user login

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // username or email
    // find user or email
    // check password
    // access & refresh token
    // cookies

    const {email, username, password} = req.body

    if(!email && !username) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{email}, {username}]
    })

    if(!user){
        throw new ApiError(404, "User doesn't exists")
    }

    const {accessToken, refreshToken} = await generateAccessandRefreshToken(user._id)

    
    const loggedInUser = await User.findById(user._id).select(" -password, -refreshToken")

    // cookies

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in successfully"
        )
    )

} )

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {},"User logged out" ))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "unauthorized request")
    }
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
       const user = await User.findById(decodedToken?._id)
    
       if(!user){
        throw new ApiError(401, "invalid refresh token")
       }
    
       if(incomingRefreshToken !== user?.refreshToken){
        throw new ApiError(401, "Refresh token is expired or used")
       }
    
       const options = {
        httpOnly: true,
        secure: true
       }
    
       const {accessToken, newRefreshToken} = await generateAccessandRefreshToken(user_.id)
    
       return res
       .status(200)
       .cookie("accessToken", accessToken)
       .cookie("refreshToken", refreshToken)
       .json(
        new ApiResponse(
            200,
            {
                accessToken,
                refreshToken: newRefreshToken
            },
            "Access token refreshed"
        )
       )
    
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
        
    }})


const changeCurrentPassword = asyncHandler(async(req,res) => {

    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isOldPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200), {}, "password changed successfully")
})

const getCurrentUser = asyncHandler(async(req,res) => {
    return res
    .status(200)
    .json(200, req.user, "Curremt user fetched successfully")
})

const updateAccountDetails = asyncHandler(async(req,res) => {
    const {fullName, email} = req.body

    if(!fullName || !email){
        throw new ApiError(400, "All fields required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Acccount detials updated successfully"))
})



export {registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser}

