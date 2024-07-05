const mongoose = require('mongoose');
const { Schema } = mongoose; 

const blogSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User' 
  },
  category:{
    type:String,
    require:true,
  },
  title: {
    type: String,
    required: true,
  },
  like: [{ type: String }],
  dislike: [{ type: String }],
  description: {
    type: String,
    required: true,
  },
  image: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
});

const Blog = mongoose.model('Blog', blogSchema);
module.exports = Blog;
