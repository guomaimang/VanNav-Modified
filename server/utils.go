package main

import (
	"crypto/tls"
	"database/sql"
	"encoding/base64"
	"fmt"
	"io/ioutil"
	"net/http"
	"strings"
)

func checkErr(err error) {
	if err != nil {
		fmt.Println("捕获到错误：", err)
	}
}

func checkTxErr(err error, tx *sql.Tx) {
	if err != nil {
		fmt.Println("出现事务异常，回滚事务:", err)
		err2 := tx.Rollback()
		checkErr(err2)
	}
}

func in(target string, str_array []string) bool {
	for _, element := range str_array {
		if target == element {
			return true
		}
	}
	return false
}

func getImgBase64FromUrl(url string) string {
	imgUrl := url
	//获取远端图片
	req, err := http.NewRequest("GET", imgUrl, nil)
	if err != nil {
		checkErr(err)
		return ""
	}
	req.Header.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36")
	client := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		},
	}
	res, err := client.Do(req)
	if err != nil {
		checkErr(err)
		return ""
	}
	defer res.Body.Close()

	// 读取获取的[]byte数据
	data, _ := ioutil.ReadAll(res.Body)

	imageBase64 := base64.StdEncoding.EncodeToString(data)
	return imageBase64
}

func getSuffixFromUrl(url string) string {
	suffix := url[strings.LastIndex(url, "."):]
	return suffix
}
func getMIME(suffix string) string {
	var t string = "image/x-icon"
	if suffix == ".svg" {
		t = "image/svg+xml"
	}
	if suffix == ".png" {
		t = "image/png"
	}
	return t
}

// 检查IP是否在白名单中
func isIPInWhiteList(ip string, db *sql.DB) bool {
	sql_check_ip := `
		SELECT COUNT(*) FROM nav_whiteip
		WHERE ip = ?;
	`
	var count int
	err := db.QueryRow(sql_check_ip, ip).Scan(&count)
	checkErr(err)
	return count > 0
}

// 获取所有白名单IP
func getAllWhiteIP(db *sql.DB) []WhiteIP {
	sql_get_white_ip := `
		SELECT id, ip FROM nav_whiteip;
	`
	rows, err := db.Query(sql_get_white_ip)
	checkErr(err)
	defer rows.Close()
	
	var whiteIPs []WhiteIP
	for rows.Next() {
		var whiteIP WhiteIP
		err = rows.Scan(&whiteIP.Id, &whiteIP.IP)
		checkErr(err)
		whiteIPs = append(whiteIPs, whiteIP)
	}
	return whiteIPs
}

// 添加白名单IP
func addWhiteIP(ip string, db *sql.DB) {
	sql_add_white_ip := `
		INSERT INTO nav_whiteip (ip)
		VALUES (?);
	`
	stmt, err := db.Prepare(sql_add_white_ip)
	checkErr(err)
	_, err = stmt.Exec(ip)
	checkErr(err)
}

// 删除白名单IP
func deleteWhiteIP(id int, db *sql.DB) {
	sql_delete_white_ip := `
		DELETE FROM nav_whiteip
		WHERE id = ?;
	`
	stmt, err := db.Prepare(sql_delete_white_ip)
	checkErr(err)
	_, err = stmt.Exec(id)
	checkErr(err)
}
