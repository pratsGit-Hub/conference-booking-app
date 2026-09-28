import mongoose, { Document, Schema } from "mongoose";

export interface IRoom extends Document {
  name: string;
  capacity: number;
  location: string;
  description?: string;
  facilities: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 1000,
    },

    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    facilities: {
      type: [String],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

roomSchema.index({
  location: 1,
  isActive: 1,
});

export const Room = mongoose.model<IRoom>(
  "Room",
  roomSchema
);