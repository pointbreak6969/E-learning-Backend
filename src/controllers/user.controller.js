import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { UserProfile } from "../models/userProfile.model.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};
const registerUser = asyncHandler(async (req, res) => {
  //take data from user like fullname, email, password
  // check if all input is provided
  // check if email already exists
  // create a new user
  // generate access token
  // generate refresh token
  // save refresh token in db
  // send access token and refresh token to user

  const { fullName, email, password } = req.body;
  if (!(fullName && email && password)) {
    throw new ApiError(400, "All input is required");
  }
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, "User already exists");
  }

  const user = await User.create({
    fullName,
    email,
    password,
  });

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while creating user");
  }
  return res
    .status(201)
    .cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    })
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    })
    .json(new ApiResponse(200, "User created successfully", createdUser));
});

const loginUser = asyncHandler(async (req, res) => {
  //first check whether the user exists or not
  //check their password
  //genereate tokens and send them
  //send response

  const { email, password } = req.body;
  if (!(email && password))
    throw new ApiError(204, "Email and Password are required");
  const existingUser = await User.findOne({ email });
  if (!existingUser) throw new ApiError(404, "User not found");
  const isPasswordValid = await existingUser.isPasswordCorrect(password);
  if (!isPasswordValid) throw new ApiError(401, "Unauthorized access");
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    existingUser._id
  );
  const loggedInUser = await User.findById(existingUser._id).select(
    "-password -refreshToken"
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie(accessToken, options)
    .cookie(refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "Logged In Successfully"
      )
    );
});

const setUpUserProfile = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  console.log(req.file);
  if (!avatarLocalPath) throw new ApiError(200, "Avatar local file not found");
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar) {
    throw new ApiError(400, "avatar file can't be uploaded on cloudinary");
  }
  console.log(avatar);
  const { description, facebookLink, githubLink, twitterLink, instagramLink } =
    req.body;
  const userProfile = await UserProfile.create({
    avatar: {
      publicId: avatar.public_id,
      url: avatar.url,
    },
    description,
    socialMedia: {
      facebook: facebookLink,
      github: githubLink,
      twitter: twitterLink,
      instagram: instagramLink,
    },
  });
  if (!userProfile)
    throw new ApiError(
      500,
      "Something went wrong while setting up the user profile"
    );
  return res
    .status(200)
    .json(new ApiResponse(200, userProfile, "User profile setup completed"));
});

const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $unset: {
        refreshToken: -1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out Successfully"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isOldPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isOldPasswordCorrect) {
    throw new APIError(400, "Invalid Old Password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password is changed successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;
  console.log({ fullname, email });
  if (!fullname || !email) {
    throw new APIError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      fullname: fullname,
      email: email,
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Check if email is provided
  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  // Find user by email
  const user = await User.findOne({ email });

  // If user doesn't exist, throw an error
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Generate reset token
  const resetToken = user.generateResetToken();

  // Save the reset token in the user document
  user.resetToken = resetToken;
  await user.save({ validateBeforeSave: false });

  // Send reset password email to the user
  // You can use a library like nodemailer to send the email
  // Example code:
  // const resetPasswordUrl = `http://your-website.com/reset-password/${resetToken}`;
  // const mailOptions = {
  //   to: user.email,
  //   subject: "Reset Password",
  //   text: `Click on the link to reset your password: ${resetPasswordUrl}`,
  // };
  // await transporter.sendMail(mailOptions);

  return res.status(200).json(new ApiResponse(200, {}, "Reset password email sent"));
});

export { registerUser, loginUser, setUpUserProfile, logOutUser, forgotPassword };
// export { registerUser, loginUser, setUpUserProfile, logOutUser };


