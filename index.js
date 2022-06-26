const express = require('express');
const moment = require('moment');
const bcrypt = require('bcrypt');
const session = require('express-session');
const flash = require('express-flash');

const db = require('./connection/db')
const upload = require('./middlewares/uploadFile.js');

const app = express();
const PORT = 80;


app.set('view engine', 'hbs');
app.use('/public', express.static(__dirname + '/public'));
app.use('/uploads', express.static(__dirname + '/uploads'));
app.use(express.urlencoded({ extended: false }));

app.use(
    session({
      secret: 'sabebngab',
      resave: false,
      saveUninitialized: true,
      cookie: { maxAge: 1000 * 60 * 60 * 2 },
    })
);

app.use(flash());

app.listen(PORT, () => {
    console.log('Server running on PORT:', PORT);
});

function getProjectDuration(endDate, startDate){
    const end = new Date(endDate);
    const start = new Date(startDate);

    let duration;

    if (start < end) {
        duration = new Date(end - start);
    }

    let years = (duration.getFullYear() - 1970);
    let months = duration.getMonth();
    let days = duration.getDate();

    let yearTxt = "year";
    let monthTxt = "month";
    let dayTxt = "day";

    if (years > 1) yearTxt += "s";
    if (months > 1) monthTxt += "s";
    if (days > 1) dayTxt += "s";

    if (years >= 1) {
      duration = `${years} ${yearTxt} ${months} ${monthTxt} ${days} ${dayTxt}`;
    } else if (months >= 1) {
       duration = `${months} ${monthTxt} ${days} ${dayTxt}`;
    } else {
        duration = `${days} ${dayTxt}`;
    } return duration;
}

function durationDate(startDate, endDate){
    const start = new Date(startDate);
    const end = new Date(endDate);

    const durationDate = `${moment(start).format('DD MMM YYYY')} - ${moment(end).format('DD MMM YYYY')}`;
    return durationDate;
}

// ========================= END PREPARATION ==========================================

app.get('/', (req, res) => {
    db.connect((err, client, done) => {
        if (err) throw err;
    
        let query = '';

        if (req.session.isLogin == true) {
            query = `SELECT tb_projects.*, tb_user.id as "user_id", tb_user.name, tb_user.email
            FROM tb_projects
            LEFT JOIN tb_user
            ON tb_projects.author_id = tb_user.id 
            WHERE tb_projects.author_id = ${req.session.user.id}
            ORDER BY tb_projects.id DESC`;
        } else {
            query = `SELECT tb_projects.*, tb_user.id as "user_id", tb_user.name, tb_user.email
            FROM tb_projects
            LEFT JOIN tb_user
            ON tb_projects.author_id = tb_user.id
            ORDER BY tb_projects.id DESC`;
        }

        client.query(query, (err, result) => {
            if (err) throw err;

            const projectsData = result.rows;
            const newProject = projectsData.map((project) => {
                project.image = project.image ? '/uploads/' + 
                                project.image : '/public/assets/adit.jpg'
                return {
                ...project,
                distanceDate: getProjectDuration(project.end_date, project.start_date),
                durationDate: durationDate(project.start_date, project.end_date),
                isLogin: req.session.isLogin,
            }
            });
            
            res.render('index', { 
                isLogin: req.session.isLogin,
                user: req.session.user,
                project: newProject });
        });
        done();
    });
});

app.get('/contact', (req, res) => {
    res.render('contact-me', { 
        isLogin: req.session.isLogin,
        user: req.session.user });
});


app.get('/add-project', (req, res) => {
    if(!req.session.user){
        req.flash('error', 'Please login first..')
        return res.redirect('/login')
    }

    res.render('project', { 
        isLogin: req.session.isLogin,
        user: req.session.user });
});

app.post('/add-project', upload.single('image'), (req, res) => {

    const title = req.body.projectName
    const start_date = req.body.startDate
    const end_date = req.body.endDate
    const description = req.body.description
    const technologies = []
    const userId = req.session.user.id
    const fileUpload = req.file.filename

    if (req.body.nodeJs) {
        technologies.push('nodeJs');
    } else {
        technologies.push('')
    }
    if (req.body.reactJs) {
        technologies.push('reactJs');
    } else {
        technologies.push('')
    }
    if (req.body.android) {
        technologies.push('android');
    } else {
        technologies.push('')
    }
    if (req.body.java) {
        technologies.push('java');
    } else {
        technologies.push('')
    }

    db.connect(function(err, client, done) {
        if (err) throw err;

        const query = `INSERT INTO tb_projects (project_name, start_date, end_date, description, technologies, image, author_id) 
                       VALUES ('${title}', '${start_date}', '${end_date}', '${description}', ARRAY ['${technologies[0]}', '${technologies[1]}','${technologies[2]}', '${technologies[3]}'], 
                       '${fileUpload}', '${userId}')`
        
        client.query(query, function(err, result) {
            if (err) throw err;

            res.redirect('/')
        });
        done();
    })
});

app.get('/project-detail/:id', (req, res) => {
    let id = req.params.id

    db.connect(function(err, client, done) {
        if (err) throw err;
        const query = `SELECT * FROM tb_projects WHERE id = ${id}`;

        client.query(query, function(err, result) {
            if (err) throw err;

            const projectDetail = result.rows[0];

            projectDetail.image = projectDetail.image ? '/uploads/' + 
                                  projectDetail.image : '/public/assets/adit.jpg'
            projectDetail.duration = getProjectDuration(projectDetail.end_date, projectDetail.start_date)
            projectDetail.start_date = moment(projectDetail.start_date).format('DD MMM YYYY')
            projectDetail.end_date = moment(projectDetail.end_date).format('DD MMM YYYY')
            
            res.render('project-detail', { isLogin: req.session.isLogin, project: projectDetail })
        });

        done();
    });
});

app.get('/delete-project/:id', (req, res) => {
    if(!req.session.user){
        req.flash('error', 'Please login first..')
        return res.redirect('/login')
    }

    let id = req.params.id

    db.connect(function(err, client, done) {
        if (err) throw err;

        const query = `DELETE FROM tb_projects WHERE id = ${id};`;

        client.query(query, function(err, result) {
            if (err) throw err;

            res.redirect('/');
        });

        done();
    });
});

app.get('/update-project/:id', (req, res) => {
    if(!req.session.user){
        req.flash('error', 'Please login first..')
        return res.redirect('/login')
    }

    let id = req.params.id

    db.connect(function(err, client, done) {
        if (err) throw err;

        const query = `SELECT * FROM tb_projects WHERE id= ${id};`

        client.query(query, function(err, result) {
            if (err) throw err;

            const projectData = result.rows[0];

            projectData.image = projectData.image ? '/uploads/' + 
                                projectData.image : '/public/assets/adit.jpg'
            projectData.start_date = moment(projectData.start_date).format('YYYY-MM-DD')
            projectData.end_date = moment(projectData.end_date).format('YYYY-MM-DD')
            

            res.render('update-project', {update: projectData, id})
        })
        done();
    })
});

app.post('/update-project/:id', upload.single('image'), (req, res) => {
    let id = req.params.id

    const title = req.body.projectName
    const start_date = req.body.startDate
    const end_date = req.body.endDate
    const description = req.body.description
    const technologies = []
    const image = req.file.filename

    if (req.body.nodeJs) {
        technologies.push('nodeJs');
    } else {
        technologies.push('')
    }
    if (req.body.reactJs) {
        technologies.push('reactJs');
    } else {
        technologies.push('')
    }
    if (req.body.android) {
        technologies.push('android');
    } else {
        technologies.push('')
    }
    if (req.body.java) {
        technologies.push('java');
    } else {
        technologies.push('')
    }

    db.connect(function(err, client, done) {
        if (err) throw err;

        const query = `UPDATE tb_projects 
                       SET project_name = '${title}', start_date = '${start_date}', end_date = '${end_date}', description = '${description}', technologies = ARRAY ['${technologies[0]}', '${technologies[1]}','${technologies[2]}', '${technologies[3]}'], image='${image}' 
                       WHERE id=${id};`

        client.query(query, function(err, result) {
            if (err) throw err;

            res.redirect('/')
        })
        done();
    })
});

app.get('/register', (req, res) => {
    res.render('register')
});

app.post('/register', (req, res) => {
    
    const name = req.body.name;
    const email = req.body.email;
    let password = req.body.password;

    password = bcrypt.hashSync(password, 10);
    
    if (name == '' || email == '' || password == '') {
        req.flash('warning', 'Please insert all fields');
        return res.redirect('/register');
    }

    db.connect(function(err, client, done) {
        if (err) throw err;

        const query = `INSERT INTO tb_user (name, email, password) 
                       VALUES ('${name}', '${email}', '${password}')`
        
        client.query(query, function(err, result) {
            if (err) throw err;

            if (err) {
                res.redirect('/register');
            } else {
                req.flash('success', 'Register success, please login to continue..');
                res.redirect('/login');
            }
        });
        done();
    });

});

app.get('/login', (req, res) => {
    res.render('login')
});

app.post('/login', (req, res) => {

    const email = req.body.email;
    const password = req.body.password;

    if (email == '' || password == '') {
        req.flash('warning', 'Please insert all fields');
        return res.redirect('/login');
    }
    
    db.connect(function(err, client, done) {
        if (err) throw err;

        const query = `SELECT * FROM tb_user WHERE email = '${email}';`;
        
        client.query(query, function(err, result) {
            if (err) throw err;

            const data = result.rows;

            if (data.length == 0) {
                req.flash('error', 'Email not found!');
                return res.redirect('/login');
            }

            const isMatch = bcrypt.compareSync(password, data[0].password);

            if (isMatch == false) {
                req.flash('error', 'Password not match!');
                return res.redirect('/login');
            }

            req.session.isLogin = true;
            req.session.user = {
                id: data[0].id,
                email: data[0].email,
                name: data[0].name,
            };

            req.flash('success', `Welcome, <b>${data[0].email}</b>`);

            res.redirect('/')
        });
        done();
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
  });