const express = require('express');
const app = express();
const port = process.env.port || 4000;
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const User = require('./UserModal');
const Blog = require('./BlogModal');
const bcrypt = require('bcrypt');
const fileupload = require('express-fileupload');
const cloudinary = require('cloudinary').v2;
const Comment= require('./CommentModal')
require('dotenv').config();
const cors = require('cors');
app.use(cors({
    origin: 'http://localhost:5173'
}));
app.use(express.json());
const jwt = require('jsonwebtoken');
const fetchUser = require('./middleware');
app.use(fileupload({
    useTempFiles: true
}));

cloudinary.config({
    cloud_name: 'dckp3ubkg',
    api_key: '954137826352828',
    api_secret: 'lF3OAF50khe4Qwn4gbhtlm34xns',
});
mongoose.connect('mongodb+srv://leenagupta993:A6B7lPfD6SD2zbED@cluster0.dxstxgl.mongodb.net/')
    .then(() => console.log('working'))
    .catch((err) => console.log(err));

const saltRounds = 10;

async function hashPassword(password) {
    try {
        const salt = await bcrypt.genSalt(saltRounds);
        const hashedPassword = await bcrypt.hash(password, salt);
        return hashedPassword;
    } catch (error) {
        console.log(error);
    }
}

app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const found = await User.findOne({ email: email });
        if (found) {
            return res.status(400).json({ message: 'user already exist' })
        }
        const hashedPassword = await hashPassword(password);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
        });
        await newUser.save();
        const data = {
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
            }
        }
        const token = jwt.sign(data, process.env.secret_key)
        res.json({
            success: true,
            token, data
        })

    } catch (error) {
        console.log(error);
        res.status(500);
    }
})
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const found = await User.findOne({ email: email });
        if (!found) {
            return res.status(400).json({ message: "user not found" })
        }
        const passwordMatch = await bcrypt.compare(password, found.password);
        if (passwordMatch) {
            const data = {
                user: {
                    id: found._id,
                    name: found.name,
                    email: found.email,

                }
            }
            const token = jwt.sign(data, process.env.secret_key);
            res.json({ success: true, token, data });
        } else {
            res.status(401).json({ message: 'Invalid credential' })
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "error", details: error });
    }
})
app.post('/postblog', fetchUser, async (req, res) => {
    let image = null;
    if (req.files && req.files.file) {
        const file = req.files.file;
        cloudinary.uploader.upload(file.tempFilePath, async (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Error uploading file to Cloudinary.' });
            }
            image = result.secure_url;
            createBlog();
        });
    } else {
        createBlog();
    }

    function createBlog() {
        const blog = new Blog({
            userId: req.user.id,
            category: req.body.category,
            title: req.body.title,
            description: req.body.description,
            image: image,
        });

        blog.save()
            .then(result => {
                console.log(result);
                res.status(200).json({
                    new_blog: result,
                });
            })
            .catch(err => {
                console.error(err);
                res.status(500).json({
                    error: 'Error in creating a blog.',
                });
            });
    }
});
app.get('/getBlog', async (req, res) => {
    try {
        const data = await Blog.find().populate('userId', 'name email');
        res.status(200).json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});
app.get('/getUser', async (req, res) => {
    try {
        const data = await User.find();
        res.status(200).json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});
app.put('/likeblog', fetchUser, async (req, res) => {
    const userId = req.user.id;
    try {
        const data = await Blog.findByIdAndUpdate(req.body._id, {
            $addToSet: { like: userId }
        }, { new: true });
        //console.log('like blog');
        res.json(data);
    } catch (err) {
        console.log({ "error in backened like part": err })
        res.status(500).json('error in backend')
    }
})
app.put('/unlikeblog', fetchUser, async (req, res) => {
    const userId = req.user.id;
    try {
        const data = await Blog.findByIdAndUpdate(req.body._id, {
            $pull: { like: userId }
        }, { new: true });
        //console.log('like blog');
        res.json(data);
    } catch (err) {
        console.log({ "error in backened like part": err })
        res.status(500).json('error in backend')
    }
})
app.delete('/delete/:_id', async (req, res) => {
    //console.log("hey");
    const id = req.params._id;
    try {
        const data = await Blog.findByIdAndDelete(id);
        res.json(data);
    } catch (err) {
        console.log({ "blogdelete in backened": err });
    }
})
app.get('/getComments/:blogId', async (req, res) => {
    const { blogId } = req.params;

    try {
        const comments = await Comment.find({ blogId }).populate('userId', 'name');
        res.status(200).json(comments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});
app.put('/updatePassword',fetchUser, async (req, res) => {
    const { password } = req.body;
    try {

      let user = await User.findById(req.user.id);
  
      if (!user) {
        return res.status(400).json({ msg: 'User not found' });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      await user.save();
      res.json({ msg: 'Password updated successfully' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });
app.post('/addComment', fetchUser, async (req, res) => {
    const { blogId, text } = req.body;

    const comment = new Comment({
        blogId,
        userId: req.user.id,
        text,
    });

    try {
        const savedComment = await comment.save();
        res.status(201).json(savedComment);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});
app.put('/updateBlog/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, category } = req.body;
    console.log(req.files);
    let image = null;
 
    try {
        if (req.files && req.files.file) {
            const file = req.files.file;
            cloudinary.uploader.upload(file.tempFilePath, async (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Error uploading file to Cloudinary.' });
                }
                image = result.secure_url;
                console.log('image',image);
                await updateBlogPost(image);
            });
        } else {
            const blog = await Blog.findById(id);
            if (!blog) {
                return res.status(404).json({ message: 'Blog not found' });
            }
            console.log('blogimage',blog.image);
            await updateBlogPost(blog.image);
        }

        async function updateBlogPost(image) {
            const blog = await Blog.findById(id);

            if (!blog) {
                return res.status(404).json({ message: 'Blog not found' });
            }

            blog.title = title;
            blog.description = description;
            blog.category = category;
            blog.image = image;
            console.log(blog);
            await blog.save();
            res.status(200).json(blog);
        }
    } catch (error) {
        console.error('Error updating blog:', error);
        res.status(500).json({ message: 'Error updating blog', error });
    }
});

app.listen(port, () => console.log('website running at ', port));
