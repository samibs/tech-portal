# Contributing to TechPortal

Thank you for your interest in contributing to TechPortal! We welcome contributions from the community and are excited to see what you'll bring to the project.

## 🤝 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## 🚀 Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- Git
- Basic knowledge of TypeScript, React, and Node.js

### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/techportal.git
   cd techportal
   ```

3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/your-org/techportal.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your development settings
   ```

6. **Initialize the database**:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

7. **Start the development server**:
   
   **Option 1: Using Management Scripts (Recommended)**
   ```bash
   # Linux/macOS
   ./techportal.sh dev
   
   # Windows Command Prompt
   techportal.bat dev
   
   # Windows PowerShell
   .\techportal.ps1 dev
   ```
   
   **Option 2: Direct npm command**
   ```bash
   npm run dev
   ```

📖 **For complete management script documentation, see [MANAGEMENT.md](./MANAGEMENT.md)**

## 📝 How to Contribute

### Reporting Bugs

Before creating bug reports, please check the [existing issues](https://github.com/your-org/techportal/issues) to avoid duplicates.

When creating a bug report, include:

- **Clear title** describing the issue
- **Detailed description** of the problem
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Environment details** (OS, Node.js version, browser)
- **Screenshots** if applicable
- **Error logs** if available

### Suggesting Features

We welcome feature suggestions! Please:

1. Check [existing discussions](https://github.com/your-org/techportal/discussions) first
2. Create a new discussion in the "Ideas" category
3. Provide a clear description of the feature
4. Explain the use case and benefits
5. Consider implementation complexity

### Pull Requests

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards
3. **Test your changes** thoroughly
4. **Commit with clear messages**:
   ```bash
   git commit -m "feat: add new process monitoring feature"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** on GitHub

## 🎯 Development Guidelines

### Code Style

We use ESLint and Prettier for code formatting. Please ensure your code passes:

```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Check TypeScript
npm run type-check
```

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add process filtering by CPU usage
fix: resolve memory leak in process monitor
docs: update API documentation for auth endpoints
```

### TypeScript Guidelines

- Use strict TypeScript settings
- Prefer interfaces over types for object shapes
- Use proper typing for all functions and variables
- Avoid `any` type unless absolutely necessary
- Use Zod schemas for runtime validation

### React Guidelines

- Use functional components with hooks
- Prefer custom hooks for reusable logic
- Use TypeScript for all props and state
- Follow the existing component structure
- Use proper error boundaries

### Backend Guidelines

- Use proper error handling with try/catch
- Validate all inputs with Zod schemas
- Use proper HTTP status codes
- Include comprehensive logging
- Follow RESTful API conventions

## 🧪 Testing

Currently, we're setting up our testing infrastructure. When contributing:

1. **Manual testing** is required for all changes
2. **Test your changes** in both development and production modes
3. **Verify** that existing functionality still works
4. **Document** any new testing procedures

Future testing guidelines will include:
- Unit tests for utilities and services
- Integration tests for API endpoints
- E2E tests for critical user flows

## 📁 Project Structure

```
techportal/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions
│   │   └── contexts/      # React contexts
├── server/                # Node.js backend
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic
│   ├── middleware/       # Express middleware
│   └── db.ts            # Database configuration
├── shared/               # Shared types and schemas
└── docs/                # Documentation
```

## 🔍 Code Review Process

1. **All contributions** require code review
2. **Maintainers** will review your PR within 48 hours
3. **Address feedback** promptly and professionally
4. **Squash commits** if requested before merging
5. **Update documentation** if your changes affect it

### Review Criteria

- Code quality and style
- Performance implications
- Security considerations
- Documentation completeness
- Test coverage (when available)
- Backward compatibility

## 🏷️ Issue Labels

We use labels to categorize issues:

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements to docs
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `priority: high` - Critical issues
- `priority: low` - Nice to have
- `status: in progress` - Currently being worked on

## 🎉 Recognition

Contributors will be recognized in:

- The project README
- Release notes for significant contributions
- Our contributors page
- Special mentions in community updates

## 📞 Getting Help

If you need help:

1. Check the [documentation](https://github.com/your-org/techportal/wiki)
2. Search [existing issues](https://github.com/your-org/techportal/issues)
3. Join our [Discord community](https://discord.gg/techportal)
4. Create a [discussion](https://github.com/your-org/techportal/discussions)

## 📋 Checklist for Contributors

Before submitting a PR, ensure:

- [ ] Code follows the style guidelines
- [ ] All linting checks pass
- [ ] TypeScript compilation succeeds
- [ ] Manual testing completed
- [ ] Documentation updated if needed
- [ ] Commit messages follow conventions
- [ ] PR description is clear and complete

## 🚀 Release Process

1. **Feature freeze** before releases
2. **Testing period** with release candidates
3. **Documentation updates** for new features
4. **Release notes** with contributor recognition
5. **Post-release** monitoring and hotfixes

## 📄 License

By contributing to TechPortal, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to TechPortal! Your efforts help make this project better for everyone. 🙏
