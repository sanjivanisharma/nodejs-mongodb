import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadFileOnCloudinary } from "../utils/cloudinary.js";


// Registering User
const registerUser = asyncHandler(async (req, res) => {
  // 1. Get details from user
  const { username, email, fullname, password } = req.body;

  // 2. Validation - Check if all fields present
  if (
    [username, email, fullname, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  if (!validateEmail) {
    throw new ApiError(400, "Invalid Email address");
  }
  if (username.toLowerCase() !== username) {
    throw new ApiError(400, "Username should be in lowercase");
  }

  // 3. Check if the user already exists
  const existedUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) {
    throw new ApiError(
      409,
      "User with given email or username already exists!"
    );
  }

  // 4. Check if images present - especially avatar image
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files?.coverImage[0]?.path;
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required");
  }

  // 5. Upload image files to cloudinary and get url
  const avatar = await uploadFileOnCloudinary(avatarLocalPath);
  const coverImage = await uploadFileOnCloudinary(coverImageLocalPath)
  if (!avatar) {
    throw new ApiError(400, "Avatar image not uploaded on cloudinary");
  }

  // 6. Create user object to store in db
  const user = await User.create({
    username,
    email,
    fullname,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });
  const createdUser = await User.findById(user._id).select(
    "-password -RefreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Error occurred while storing the user in db");
  }

  // 7. Sending user data with response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully!"));
});


// User logging in
const loginUser = asyncHandler(async (req, res, next) => {
  // 1. Get user details
  const {username, email, password} = req.body
  if(!(username || email)) {
    throw new ApiError(400, "Username or email is required")
  }

  // 2. Check if user with giver username/email present in db
  const user = await User.findOne({
    $or: [{username}, {email}]
  })
  if(!user) {
    throw new ApiError(404, "User with this username or email does not exists")
  }

  // 3. Check if password is correct
  const isPasswordValid = await user.isPasswordCorrect(password)
  if(!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials")
  }

  // 4. Generate access and refresh tokens
  const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

  // 5. Sending response (user data and cookies) back to client
  delete user.password
  user.refreshToken = refreshToken
  const cookieOptions = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .cookie("accessToken", accessToken, cookieOptions)
  .cookie("refreshToken", refreshToken, cookieOptions)
  .json(
    new ApiResponse(200, {user, accessToken, refreshToken}, "User logged in successfully")
  )
})


// User logout
const logoutUser = asyncHandler(async (req, res) => {
  // 1. Remove refresh token from db
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined }
    },
    {
      returnDocument: 'after'
    }
  )

  // 2. Remove cookies and send response
  const cookieOptions = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .clearCookie("accessToken", cookieOptions)
  .clearCookie("refreshToken", cookieOptions)
  .json(new ApiResponse(200, {}, "User logged out successfully"))
})



const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }
     
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating access and refresh tokens")
  }
}


function validateEmail(email) {
  const regex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
  return regex.test(email);
}

export { registerUser, loginUser, logoutUser };
