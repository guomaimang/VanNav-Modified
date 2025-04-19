package main

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
)

// JTW 密钥
var jwtSecret = []byte("boy_next_door")

// 签名一个 JTW
func SignJWT(user User) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"name": user.Name,
		"id":   user.Id,
		"exp":  time.Now().Add(time.Hour * 24 * 7).Unix(),
	})
	tokenString, err := token.SignedString([]byte(jwtSecret))
	return tokenString, err
}

// 签名一个 JTW
func SignJWTForAPI(tokenName string, tokenId int) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"name": tokenName,
		"id":   tokenId,
		"exp":  time.Now().Add(time.Hour * 24 * 365 * 100).Unix(),
	})
	tokenString, err := token.SignedString([]byte(jwtSecret))
	return tokenString, err
}

// 解密一个 JTW
func ParseJWT(tokenString string) (*jwt.Token, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (i interface{}, e error) {
		return jwtSecret, nil
	})
	return token, err
}

// 定义一个 JWT 的中间件
func JWTMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		rawToken := c.Request.Header.Get("Authorization")
		if rawToken == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success":      false,
				"errorMessage": "未登录",
			})
			c.Abort()
			return
		}
		// 解析 token
		token, err := ParseJWT(rawToken)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success":      false,
				"errorMessage": "未登录",
			})
			c.Abort()
			return
		}
		// 把名称加到上下文
		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			c.Set("username", claims["name"])
			c.Set("uid", claims["id"])
			c.Next()
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success":      false,
				"errorMessage": "未登录",
			})
			c.Abort()
			return
		}
	}
}

func JWTCheck(c *gin.Context) bool {
	// 首先检查IP白名单
	clientIP := c.ClientIP()
	if isIPInWhiteList(clientIP, db) {
		return true
	}

	// 然后检查token - 支持两种header格式
	var rawToken string
	// 先尝试从 Authorization header 获取
	rawToken = c.Request.Header.Get("Authorization")
	if rawToken == "" {
		// 如果没有，再尝试从 Token header 获取
		rawToken = c.Request.Header.Get("Token")
	}

	// 如果都没有token，返回false
	if rawToken == "" {
		return false
	}

	// 解析 token
	token, err := ParseJWT(rawToken)
	if err != nil {
		return false
	}

	// 验证token是否有效
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		// token有效，设置用户信息到上下文
		c.Set("username", claims["name"])
		c.Set("uid", claims["id"])
		return true
	}

	return false
}
