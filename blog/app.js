const express = require('express');
const _ = require('lodash');
const fs = require('fs');
const util = require('util');
const ejs = require('ejs');

const postsByPage = 10;

const app = express();

// little tricky to render html files :P
app.set('view engine', 'html');
app.engine('html', ejs.renderFile);
app.set('views', __dirname + '/views');

const readDirPromise = util.promisify(fs.readdir);
const readFilePromise = util.promisify(fs.readFile);

async function getPosts (postFiles) {
    const posts = [ ];

    for (let filename of postFiles) {
        if (!/\.html$/.test(filename)) continue;

        const fileContent = await readFilePromise(`${__dirname}/posts/${filename}`);
        const tpl = _.template(fileContent.toString().split("<div class='full-post'>")[0]);

        const link = `/post/${filename}`;
        posts.push({ html: tpl({ link  }), link });
    }

    return posts;
}

async function indexHandler (req, res) {
    let page = Number(req.params.page || 1);
    if (isNaN(page) || page <= 0) page = 1;

    const postFiles = await readDirPromise(`${__dirname}/posts`);
    postFiles.sort((a, b) => a < b);
    const posts = await getPosts(postFiles);

    res.render('index', { posts });
}

function toUpperInitial (str) {
    return str.substring(0, 1).toUpperCase() + str.substring(1);
}

function filenameToPostTitle (filename) {
    const filenameWithoutDate = filename.replace(/^\d{4}-\d{2}-\d{2}-/, '');
    const title = toUpperInitial(filenameWithoutDate.replace(/\.html$/, ''));

    return title.replace(/\-/g, ' ');
}

async function openPostHandler (req, res) {
    try {
        const { filename } = req.params;
        const content = await readFilePromise(`${__dirname}/posts/${filename}`);

        res.render('post-view', {
            html: content.toString(),
            title: filenameToPostTitle(filename),
            url: `https://blog.deividy.com/post/${filename}`,
            pageId: filename
        });
    } catch (ex) {
        res.redirect('/not-found.html');
    }
}

async function notFoundHandler (req, res) { res.render('not-found'); }

app.get('/', indexHandler);
app.get('/:page(\\d+)', indexHandler);
app.get('/post/:filename', openPostHandler);
app.use(notFoundHandler);

app.listen(4200);
