import LinkedInIcon from '@mui/icons-material/LinkedIn';
import GitHubIcon from '@mui/icons-material/GitHub';
import InstagramIcon from '@mui/icons-material/Instagram';
import { htmll, csss, javaScriptt, react_js, material_ui, ejs, node_js, express_js, postgresql, my_sql, gitt, githubb, postman, vs_code, project1, project2, project3, mongoDB, tailwindCSS, daisyUI, project4} from '../assets/images';
export const navLinks = [
    {label:"Home", href:"#home"},
    {label:"About Me", href:"#aboutMe"},
    {label:"Skills", href:"#skills"},
    {label:"Projects", href:"#projects"},
    {label:"Education", href:"#education"},
    {label:"Contact Us", href:"#contact_us"},
]
export const role = ["Designer", "Developer","Programmer"]
export const socialsIcons = [
    {icon:LinkedInIcon, href:"https://www.linkedin.com/in/ahmar-ansari-80313225a/"},
    {icon:GitHubIcon, href:"https://github.com/Ahmar512"},
    {icon:InstagramIcon, href:""},
]
export const skills = [
    {
        title: "Frontend",
        tech:[
            {label: "React Js", href: react_js},
            {label: "HTML", href: htmll},
            {label: "CSS", href: csss},
            {label: "JavaScript", href: javaScriptt},
            {label: "Daisy UI", href: daisyUI},
            {label: "Tailwind CSS", href: tailwindCSS},
        ]
    },
    {
        title: "Backend",
        tech:[
            {label: "Node JS", href: node_js},
            {label: "Express JS", href: express_js},
            {label: "MySQL", href: my_sql},
            {label: "Postgresql", href: postgresql},
            {label: "MongoDB", href: mongoDB},
        ]
    },
    {
        title: "Others",
        tech:[
            {label: "Git", href: gitt},
            {label: "GitHub", href: githubb},
            {label: "Postman", href: postman},
            {label: "VS code", href: vs_code},
        ]
    }
]
export const projects = [
    {
        title: "Real-Time Chat Application",
        content: "Built a real-time chat application with instant messaging, image sharing via Cloudinary, real-time communication using Socket.IO, and a modern UI designed with DaisyUI and Tailwind CSS.",
        href: project4,
        link: "https://chat-app-7xw0.onrender.com/login",
        tech:["React JS", "Tailwind CSS", "JavaScript","MongoDB","Express JS", "Socket.IO"]
    },
    {
        title: "Authentication System",
        content: "Developed a secure authentication system that allows users to log in or sign up with their email, with OTP sent for verification. The system uses JSON Web Tokens (JWT) to manage sessions and ensure secure user data protection.",
        href: project3,
        link: "https://auth-project-2-hy1v.onrender.com",
        tech:["React JS", "Tailwind CSS", "JavaScript","MongoDB","Node JS", "NodeMailer"]
    },
    {
        title: "MediInfoHub",
        content: "Created an informative healthcare website that provides users with reliable medical information, utilizing HTML, CSS, and JavaScript for a clean and user-friendly design.",
        href: project1,
        link: "https://ahmar512.github.io/MediInfoHub/",
        tech:["React JS", "Tailwind CSS", "REST API", "JavaScript"]
    },
    {
        title: "Nike Themed Website",
        content: "Developed a responsive and visually appealing Nike-themed website using React JS, Tailwind CSS, and JavaScript, showcasing a modern product layout and interactive elements.",
        href: project2,
        link: "https://ahmar512.github.io/nike-simple/",
        tech:["React JS", "Tailwind CSS",  "JavaScript"]
    }
]