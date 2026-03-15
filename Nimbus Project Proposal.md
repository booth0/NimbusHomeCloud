# **Project Name: Nimbus \- Personal Home Cloud**

## **Contact Information**

**Student:** Adam Booth  
 **Contact:** [boo22006@byui.edu](mailto:boo22006@byui.edu) \+ (602) 828-3574

## **Stakeholders**

**Primary Stakeholder:**

* **Adam Booth** \- Developer and primary user  
* **Contact:** *See above*

**Secondary Stakeholders:**

* **Scarlet Booth** \- My wife  
* Contact: [scarlettineo0@gmail.com](mailto:scarlettineo0@gmail.com) \+ (732) 799-1573

## **Purpose**

One reason why I decided to do this project was because I noticed that between my wife and I, we have many photos that take up more space than our phones can store. I could just place all the photos on a hard drive on my pc, but then we wouldn't be able to access and look at them in a convenient way on our mobile devices. There exist cloud services that could remedy the issue such as Google Photos, Shutterfly, Facebook, etc., but they come with caveats concerning pricing and security that I would prefer not to deal with.

My purpose with this project is to create a personal home cloud similar to Google Drive with its own UI that can be accessed within (and eventually outside) my home network by multiple users. I plan to host the server myself with an old desktop pc. This will allow me to not be restricted by Google's storage limit or subscription fees for cloud storage and provide a decent alternative from Google for file sharing.

## **Background/Prior Knowledge**

Web development is what I have been focusing on while studying Software Engineering, so I have a decent amount of experience in full stack development both from in class learning and real world experience recreating the website for a company called Dakland Solutions through a project based internship. I hope to use that experience to make a pleasant frontend that pairs with a backend that is able to interact well with the server. Speaking of the server, I have recently been dabbling with repurposing older desktop PCs as servers, most recently using Ubuntu Server to host a personal Jellyfin media server.

I am recreating something that has been done before with Google Drive, but I hope to make this project my own. I haven't done any prior work for this project yet. I became interested in this idea since I wanted to find a way to combine both a full stack project along with a home server/database.

I consider myself an intermediate level developer in web technologies (React, Node.js, Express) and a beginner in server administration and security/encryption implementation.

\*\*\*\* TO DO  
Initial research  
Topic Web/Mind map

## **Description**

### **Why? \- Reason to Use**

My wife and I, like many families today, face a common problem: we're drowning in digital photos with nowhere affordable and secure to store them. Cloud services either charge monthly fees that add up over time, impose strict storage limits, or raise privacy concerns by storing our personal memories on third-party servers. This solution addresses subscription fatigue, privacy concerns, and the desire for unlimited storage that users truly own. Once families experience the freedom of owning their data without monthly fees or storage caps, they won't want to return to restrictive commercial options.

### **What? \- Solution Description**

My project is a self-hosted home cloud storage system that will allow users to securely upload, download, and share files through a web-based interface. This project will feature user login and role management, a file upload/download system with sharing links, encryption for privacy, and the ability to manage files from anywhere or even remotely.

This type of solution does already exist in the form of similar services such as Google Drive, Dropbox, OneDrive, and iCloud, however, these services come with their own costs. There are privacy concerns with putting personal data on 3rd party servers, the free tiers of these services are typically very limited, requiring users to pay monthly if more space is needed, switching between vendors is costly, and ultimately, users aren't able to freely customize how their storage works, enforce their own policies, or extend the system.

My project will give the users full control over their data by running their own personal or dedicated server. Privacy is a priority, allowing users to maintain control over their files and storage size, while avoiding monthly subscription fees. This project will also be completely customizable, giving users the freedom to make changes at their discretion and let them know exactly how their files are being stored and secured.

Am I reinventing the wheel? Yes and no. Similar file storage systems exist, but most are locked down or commercialized. My purpose isn't to simply copy what these services have already done, but instead to build a system that is custom fit to the individual needs of some users, namely to be private and expandable. It's also about exploring how cloud principles can be applied at a personal scale. In short, I'm taking an existing idea, identifying their flaws, and tailoring a better, more personal, solution.

That being said, my solution also has its own flaws. It requires users to not only buy or repurpose older technology, but learn the base-level amount of technical knowledge to get everything set up and secured. This solution requires more from the user than larger cloud services, but it makes up for it by giving the users more control over their data.

This system empowers people to own their data in a world where privacy breaches and subscription fatigue are growing concerns. This solution isn't for everyone, but those who put in the effort to learn the system will be rewarded with a system that they can own and customize. Once users experience the freedom that comes with this service, they will hesitate to give it back up and return to the mainstream options.

### **Who? \- Target Audience**

My primary target audience consists of:

* **Tech-savvy families** tired of paying for cloud storage and concerned about privacy  
* **Small businesses** looking to avoid recurring cloud costs while maintaining secure file sharing  
* **Tech enthusiasts and hobbyists** who want to customize their own backup solutions and media libraries  
* **Privacy-conscious individuals** who prefer to maintain complete control over their data

The customer and user can be the same person (individual tech enthusiast) or different (IT administrator sets it up, family members use it). My primary audience skews toward those aged 25-55 with moderate to high technical ability, though the end-user interface will be simple enough for less technical family members once setup is complete.

This solution is not geographically restricted and can be used anywhere with internet access. However, it's particularly appealing in regions where cloud service costs are high or internet infrastructure makes large cloud uploads/downloads impractical.

### **Where? \- Platform**

**Development Environment:**

* Primary development on Windows PC using VS Code  
* Testing on Ubuntu Server 24.04 LTS (running on repurposed desktop)  
* Docker containers for consistent deployment

**Deployment/Usage:**

* Hosted on personal Ubuntu Server (home network)  
* Accessible via web browser (any device with internet access)  
* Initial deployment: local network only  
* Future: remote access via VPN or port forwarding with proper security

### **How? \- Workflow**

**User Workflow:**

1. User navigates to the web interface via browser  
2. Logs in with credentials (JWT authentication)  
3. Views their personal file dashboard  
4. Can upload files via drag-and-drop or file picker  
5. Can download files by clicking them  
6. Can share files by generating time-limited share links  
7. Can manage files (delete, rename, organize)

**Technical Implementation:**

* **Authentication:** JWT-based authentication with bcrypt password hashing  
* **Roles:** Admin role (manages users, servers, monitors activity) and User role (uploads, downloads, shares files)  
* **File Management:** Files stored on server filesystem with metadata in MongoDB (filename, owner, size, permissions, expiration)  
* **Sharing:** Generate shareable links with expiration dates or restricted access  
* **Tech Stack:**  
  * Frontend: React  
  * Backend: Node.js \+ Express  
  * Database: MongoDB  
  * Server: Linux (Ubuntu) with Docker  
  * Security: JWT, bcrypt, TLS/HTTPS, AES encryption

### **When? \- SMART Goals & Completion Criteria**

**The project is considered complete when:**

1. Users can register and log in securely with role-based access  
2. Users can upload and download files through a web interface  
3. Users can generate and use time-limited sharing links  
4. Files are encrypted at rest using AES  
5. The system runs on HTTPS with proper TLS certificates  
6. The interface is mobile-friendly and intuitive  
7. Basic multi-server metadata tracking is implemented  
8. The system is documented with user and developer guides

**Minimum Viable Product (MVP) for Demo:**

* Working authentication system  
* File upload/download functionality  
* Share link generation  
* Encrypted file storage  
* Clean, functional UI  
* Running on local server

**Stretch Goals (if time permits):**

* Cross-server file sharing  
* Desktop sync client  
* Advanced file organization features  
* Activity logging and analytics

## **Significance**

This project is highly significant for several reasons:

**Real-World Impact:** This addresses genuine problems faced by millions of people: rising cloud storage costs, privacy concerns, and lack of control over personal data. My wife and I are the immediate stakeholders who will benefit, but the solution scales to help families, small businesses, and tech communities.

**Resume Worthiness:** This project demonstrates full-stack development expertise, security implementation, server administration, and the ability to architect a complete system from scratch.

**What I would put on my resume:**

*Personal Home Cloud Storage System* (Full-Stack Developer)  
 Architected and developed a self-hosted cloud storage solution with encrypted file management, role-based authentication, and time-limited sharing capabilities. Built using React, Node.js, Express, and MongoDB, deployed on containerized Linux servers. Implemented JWT authentication, AES encryption, and HTTPS security protocols.

This showcases skills employers value: security awareness, full-stack capabilities, database design, API development, user authentication, and the ability to deliver complete, production-ready systems. It demonstrates I can build real solutions to real problems, not just follow tutorials.

## **New Computer Science Concepts**

While I have experience with web development, this project requires me to learn several new computer science concepts:

1. **Encryption & Security Implementation:**

   * AES encryption for files at rest  
   * Implementing TLS/HTTPS with certificate management  
   * Secure token generation for share links  
   * Understanding attack vectors and how to prevent them (SQL injection, XSS, CSRF)  
2. **Authentication & Authorization Systems:**

   * JWT (JSON Web Tokens) implementation from scratch  
   * Role-based access control (RBAC) design patterns  
   * Session management and token refresh strategies  
3. **Server Administration & DevOps:**

   * Docker containerization for deployment  
   * Linux server hardening and security best practices  
   * Network configuration for remote access (VPN setup, port forwarding, firewall rules)  
   * Server monitoring and logging  
4. **Distributed Systems Concepts:**

   * Multi-server metadata management  
   * Server-to-server communication and federation  
   * Data consistency across distributed storage  
5. **File System Management:**

   * Efficient file storage strategies  
   * Chunked file uploads for large files  
   * Metadata vs. actual file storage separation  
   * Storage optimization techniques  
6. **Database Schema Design for File Systems:**

   * MongoDB schema design for file metadata  
   * Indexing strategies for fast file retrieval  
   * Relationship modeling for users, files, and permissions

These concepts go beyond "learning a language" and represent fundamental computer science and software engineering principles that are critical for building secure, scalable systems.

## **Interestingness**

This project excites me on multiple levels:

**Personal Problem-Solving:** I'm genuinely frustrated by the current state of cloud storage. I'm tired of paying Google for storage, worried about privacy, and want complete control over my family's photos and documents. Building my own solution scratches a real itch.

**Technical Challenge:** This project sits at the intersection of multiple domains I find fascinating: web development, security, server administration, and distributed systems. It's not just about using shiny new tools, it's about understanding how cloud storage actually works under the hood and implementing those principles myself.

**Problem Domain Interest:** I'm passionate about data ownership and privacy. The trend toward subscription-everything and giving up control of personal data bothers me. This project lets me explore alternatives and prove that individuals can still own their digital lives.

**Long-Term Value:** Unlike throwaway projects, this is something I'll actually use for years. Every time my wife uploads a photo or I share a file with family, I'll be using something I built. That ongoing utility keeps me motivated.

**Learning Journey:** I love the challenge of taking something that seems complex (cloud storage) and breaking it down until I understand it well enough to build it myself. The security and encryption aspects especially intrigue me as they're critical skills for modern software engineering.

**Community Impact:** If this works well, I could open-source it or help others set up their own instances. Contributing to the self-hosting community and helping others escape subscription fatigue would be incredibly satisfying.

When roadblocks hit, I'll push through because I genuinely want this solution to exist and work. This isn't about learning React or MongoDB better, it's about solving a real problem I face daily and proving to myself I can build production-quality systems.

## **Tasks and Schedule**

**Total Estimated Hours:** 113 hours (below the 126-hour target, leaving buffer for unexpected challenges)

**Week 3 \- Setup & Planning (9 hours)**

* Set up development environment (Linux server, Node.js, MongoDB, Git repo)  
* Write high-level architecture diagram and finalize requirements  
* Configure project scaffolding (Express \+ React)  
* **Deliverable:** Running "Hello World" server \+ GitHub repo initialized  
* **Evidence:** GitHub commit history, running server screenshot

**Week 4 \- Authentication & Database (10 hours)**

* Implement user registration/login with bcrypt password hashing  
* Add JWT-based sessions  
* Design MongoDB schema for users & roles  
* **Deliverable:** Secure login system with role management  
* **Evidence:** Successful login demo, database schema documentation

**Week 5 \- Basic File Upload/Download (10 hours)**

* Implement file upload API (to local filesystem)  
* Add metadata storage (filename, owner, size, date)  
* Implement file download endpoint  
* **Deliverable:** User can upload and download their own files  
* **Evidence:** Working upload/download demo video

**Week 6 \- File Sharing Links (12 hours)**

* Add time-limited public links (signed JWT tokens)  
* Permissions: public link vs. private share  
* UI for generating/copying share links  
* **Deliverable:** Files can be shared via expiring links  
* **Evidence:** Share link generation and access demo

**Week 7 \- Frontend UI Improvements (10 hours)**

* Build file explorer UI (React): list files, delete, share  
* Drag-and-drop upload  
* Mobile-friendly layout  
* **Deliverable:** Working file dashboard  
* **Evidence:** Screenshots of UI, mobile responsiveness demo

**Week 8 \- Security & Encryption (12 hours)**

* Enable TLS/HTTPS (self-signed cert for dev)  
* Implement AES file encryption at rest  
* Harden authentication & sanitize inputs  
* **Deliverable:** Secure system with encrypted storage  
* **Evidence:** SSL certificate verification, encrypted file verification

**Week 9 \- Multi-Server Metadata (8 hours)**

* Extend schema to allow multiple servers per account  
* Users can "register" a new server  
* Show which files live on which server  
* **Deliverable:** Metadata system supports multi-server  
* **Evidence:** Database schema update, multi-server UI

**Week 10 \- Cross-Server Sharing (10 hours)**

* Implement secure link sharing between servers  
* One server generates share link, another server fetches file  
* **Deliverable:** Proof-of-concept file transfer across servers  
* **Evidence:** Cross-server file transfer demo

**Week 11 \- Federation API (Stretch Goal) (10 hours)**

* Implement prototype server-to-server REST API for sharing  
* Servers can send "share offers" directly (no manual links)  
* Log activity for auditing  
* **Deliverable:** Servers can exchange files using API (basic federation)  
* **Evidence:** API documentation, server-to-server communication logs

**Week 12 \- Testing & Polish (12 hours)**

* Write unit tests \+ integration tests for core features  
* Fix UI/UX issues  
* Improve error handling & logging  
* **Deliverable:** Stable system, ready for demo  
* **Evidence:** Test coverage report, bug fixes log

**Week 13 \- Documentation & Final Demo Prep (10 hours)**

* Write user guide (setup, usage, roles)  
* Write developer documentation (API endpoints, database schema)  
* Run mock demo/presentation  
* **Deliverable:** Polished project, fully documented  
* **Evidence:** Complete documentation, final demo video

**Total Hours: 113 hours (89% of target 126 hours)**

The remaining 13 hours provide buffer time for unexpected challenges, debugging, and additional polish. This schedule is realistic as it allocates significant time to security (12 hours), testing (12 hours), and file sharing features (12 hours), which are complex areas that often take longer than anticipated.

**Success Measurement:** I will track hours using Toggl and maintain a weekly development log. Each week's deliverable must be functional and demonstrable before moving to the next phase. Progress will be measured by working features, not just time spent.

## **Resources**

**Hardware:**

* Repurposed desktop PC for server (already owned) \- $0  
* Primary development laptop (already owned) \- $0  
* Mobile devices for testing (already owned) \- $0

**Software & Tools:**

* **IDE:** Visual Studio Code (free)  
* **Languages:** JavaScript/Node.js (free)  
* **Frontend:** React (free, open-source)  
* **Backend:** Express.js (free, open-source)  
* **Database:** MongoDB Community Edition (free)  
* **Server OS:** Ubuntu Server 24.04 LTS (free)  
* **Containerization:** Docker (free)  
* **Version Control:** Git \+ GitHub (free)  
* **Security Libraries:** bcrypt, jsonwebtoken, crypto (free, npm packages)  
* **TLS Certificates:** Let's Encrypt or self-signed (free)

**Learning Resources:**

* **Books/Documentation:**  
  * Node.js Documentation (free, online)  
  * React Documentation (free, online)  
  * MongoDB Documentation (free, online)  
  * OWASP Security Guidelines (free, online)  
* **Tutorials/Courses:**  
  * JWT authentication tutorials (free, YouTube/Medium)  
  * Docker deployment guides (free, online)  
  * TLS/HTTPS implementation guides (free, online)

**Total Estimated Cost: $0**

All required resources are either already owned or freely available. No purchases necessary.

## **Dependencies**

**Development Dependencies:**

* **Languages:** JavaScript (Node.js v18+)  
* **IDE:** Visual Studio Code (or any text editor)  
* **Platform:**  
  * Development: Windows 10/11 PC  
  * Server: Ubuntu Server 24.04 running on repurposed desktop  
  * Testing: Web browsers (Chrome, Firefox, Safari)  
* **Package Managers:** npm (comes with Node.js)

**Installation Requirements:**

* Node.js and npm (for development)  
* MongoDB (for database)  
* Docker (for containerized deployment)  
* Git (for version control)

**Network/Deployment:**

* Local network access to server  
* (Optional) Dynamic DNS service for remote access  
* (Optional) VPN setup for secure remote access  
* Port forwarding configuration on router (if enabling remote access)

**External Dependencies:**

* Internet connection for downloading packages  
* npm packages: express, react, mongoose, bcrypt, jsonwebtoken, multer (file uploads), etc.  
* No paid APIs or external services required

**Success Dependencies:**

* Access to repurposed desktop PC for server (already have)  
* Basic understanding of React and Node.js (already have from coursework)  
* Time to learn security and encryption concepts (allocated in schedule)  
* No external stakeholder dependencies beyond my wife providing feedback

**Risks:**

* **Learning curve for encryption:** May take longer than estimated (mitigated by allocating 12 hours)  
* **Server hardware failure:** Old desktop might fail (mitigated by having backup laptop)  
* **Scope creep:** May want to add too many features (mitigated by clear MVP definition)  
* **Network security complexity:** Remote access setup could be challenging (mitigated by starting with local-only access)  
* **Time management:** Balancing with other courses (mitigated by realistic weekly hour estimates)

All dependencies are either already in place or easily obtainable at no cost. No significant blockers identified.

