import mongoose, {Schema} from "mongoose";
import mongoseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema({
    videoFile:{
        publicId: {
            type: String,
            required: true
        },
        url: {
            type: String,
            required: true
        }
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    title: {
        type: String,
        required: true
    },
    duration: {
        type: Number,
    },
    views: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
})
videoSchema.plugin(mongooseAggregatePaginate);
export const Video = mongoose.model("video", videoSchema);