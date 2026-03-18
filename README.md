# Team Development Guide

# Development Workflow
This project uses **Jira for task management** and **GitHub for version control**.  
To keep development organised, all team members must follow the workflow described below.

---

# Branch Structure
Our repository follows this branch hierarchy:
main
│
└── develop
      │
      ├── SCRUM-XX-feature-name
      ├── SCRUM-XX-feature-name
      └── SCRUM-XX-feature-name

## Branch Roles

### main
- Stable production-ready version
- Only updated at major milestones

### develop
- Integration branch for the current sprint
- All feature branches merge here

### feature branches
- Created for individual Jira tasks
- Named using the Jira ticket key

Example: SCRUM-69-create-login-ui


---

# Jira → GitHub Workflow

Each development task should start from a **Jira issue**.

Example issue: SCRUM-69 User Login UI


The Jira ticket ID should always appear in:
- Branch name
- Commit messages
- Pull requests

This allows Jira to automatically link development activity.

---

# Creating a Branch from Jira

1. Open the Jira issue.
2. In the **Development panel**, click **Create branch**.
3. Select the repository.
4. Branch from: develop

This automatically links the branch to the Jira issue.

---

# Working on the Task Locally

After the branch is created, fetch it locally.

## Update repository

```bash
git checkout develop
git pull origin develop
```

# Committing Code

Commit frequently with meaningful messages.

Example:

```bash
git add .
git commit -m "SCRUM-69 Implement login page layout"
```

Important rules:

Always include the **Jira ticket number**

# Creating a Pull Request

Once the task is complete:

Go to the GitHub repository.

Click Pull Requests.

Click New Pull Request.

Set the branches as:
base: develop
compare: SCRUM-xx-feature-stuff

# Important
## Always branch from development, never create branches directly from main or commit directly to main.



