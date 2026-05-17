package ai

// Service will wrap AI-powered post-round analysis.
// Keeping AI behind its own service will let handlers ask for "analyze this round"
// without knowing which model, prompt format, or SDK the app uses underneath.
type Service struct{}
