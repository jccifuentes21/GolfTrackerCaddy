package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserIDKey contextKey = "userID"

// Holds the JWKS - the set of public keys Clerk uses to sign JWTs. Keyfun is an interface that wraps the key fetfching logic.
type AuthMiddleware struct {
	jwks keyfunc.Keyfunc
}

// This is the constructor. keyfunc.NewDefault fetches clerk's public keys from the JWKS url and caches them. If keys are rotated by clerk, it is also handled.
func NewAuthMiddleware(jwksURL string) (*AuthMiddleware, error) {
	k, err := keyfunc.NewDefault([]string{jwksURL})
	if err != nil {
		return nil, err
	}
	return &AuthMiddleware{jwks: k}, nil
}

// 1. Check the header — looks for Authorization: Bearer <token>. If it's missing or malformed, bail immediately.
// 2. Parse and verify the token — jwt.Parse takes the raw token string and m.jwks.Keyfunc. The keyfunc is what does the cryptographic verification — it looks up the right public key from the cached JWKS and checks that Clerk's signature on the token is valid. If the token was tampered with, expired, or forged, this fails.
// 3. Extract the user ID — a JWT's payload is called "claims" — key/value pairs baked into the token. sub (subject) is the standard claim for user identity. Clerk puts the Clerk user ID there, e.g. user_2abc123. We cast token.Claims to jwt.MapClaims which is just a map[string]any under the hood, then pull sub out of it.
func (m *AuthMiddleware) extractUserID(r *http.Request) (string, error) {
	authHeader := r.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return "", fmt.Errorf("missing bearer token")
	}

	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
	token, err := jwt.Parse(tokenStr, m.jwks.Keyfunc)
	if err != nil || !token.Valid {
		return "", fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", fmt.Errorf("invalid claims")
	}

	//sub is the standard claim for user identity.
	//Clerk puts the Clerk user ID there, e.g. user_2abc123. We cast token.Claims to jwt.MapClaims which is just a map[string]any under the hood, then pull sub out of it.
	userID, ok := claims["sub"].(string)
	if !ok || userID == "" {
		return "", fmt.Errorf("missing user ID")
	}

	return userID, nil
}

func (m *AuthMiddleware) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			userID, err := m.extractUserID(r)
			if err != nil {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
}
