package main

import (
	"database/sql"
	"fmt"
)

func initDB() {
	PathExistsOrCreate("./data")
	// 创建数据库
	db, _ = sql.Open("sqlite", "./data/nav.db")
	// user 表
	sql_create_table := `
		CREATE TABLE IF NOT EXISTS nav_user (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT,
			password TEXT
		);
		`
	_, err := db.Exec(sql_create_table)
	checkErr(err)
	// setting 表
	sql_create_table = `
	CREATE TABLE IF NOT EXISTS nav_setting (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		favicon TEXT,
		title TEXT,
		govRecord TEXT,
		logo192 TEXT,
		logo512 TEXT,
		hideAdmin BOOLEAN,
		hideGithub BOOLEAN,
		jumpTargetBlank BOOLEAN
	);
	`
	_, err = db.Exec(sql_create_table)
	checkErr(err)
	// 增加 logo192 字段
	sql_add_logo192 := `
		ALTER TABLE nav_setting ADD COLUMN logo192 TEXT;
		`
	db.Exec(sql_add_logo192)

	// 增加 logo512 字段
	sql_add_logo512 := `
		ALTER TABLE nav_setting ADD COLUMN logo512 TEXT;
		`
	db.Exec(sql_add_logo512)

	// 增加 govRecord 字段
	sql_add_govRecord := `
		ALTER TABLE nav_setting ADD COLUMN govRecord TEXT;
		`
	db.Exec(sql_add_govRecord)

	// 增加 jumpTargetBlank 字段
	sql_add_jumpTargetBlank := `
	ALTER TABLE nav_setting ADD COLUMN jumpTargetBlank BOOLEAN;
	`
	db.Exec(sql_add_jumpTargetBlank)

	// 默认 tools 用的 表
	sql_create_table = `
		CREATE TABLE IF NOT EXISTS nav_table (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT,
			url TEXT,
			logo TEXT,
			catelog TEXT,
			desc TEXT
		);
		`
	_, err = db.Exec(sql_create_table)
	checkErr(err)

	// tools数据表结构升级-20230327
	sql_create_table = `
		ALTER TABLE nav_table ADD COLUMN sort INTEGER;
		`
	_, err = db.Exec(sql_create_table)
	checkErr(err)

	// tools数据表结构升级-20230627
	sql_create_table = `ALTER TABLE nav_table ADD COLUMN hide BOOLEAN;`
	_, err = db.Exec(sql_create_table)
	checkErr(err)

	sql_create_table = `UPDATE nav_table SET hide = false where hide IS NULL;`
	_, err = db.Exec(sql_create_table)
	checkErr(err)

	// 分类表
	sql_catelog_table := `
		CREATE TABLE IF NOT EXISTS nav_catelog (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT
		);
		`
	_, err = db.Exec(sql_catelog_table)
	checkErr(err)

	// 分类表表结构升级-20230327
	sql_catelog_table = `
		ALTER TABLE nav_catelog ADD COLUMN sort INTEGER;
		`
	_, err = db.Exec(sql_catelog_table)
	checkErr(err)
	// 分类表表结构升级-20240303
	sql_catelog_table = `
		ALTER TABLE nav_catelog ADD COLUMN hide BOOLEAN;
		`
	_, err = db.Exec(sql_catelog_table)
	checkErr(err)
	sql_catelog_table = `UPDATE nav_catelog SET hide = false where hide IS NULL;`
	_, err = db.Exec(sql_catelog_table)
	checkErr(err)

	// 设置表表结构升级-20230628
	sql_create_table = `
		ALTER TABLE nav_setting ADD COLUMN hideAdmin BOOLEAN;
		`
	_, err = db.Exec(sql_create_table)
	checkErr(err)

	// 设置表表结构升级-20230627
	sql_create_table = `
		ALTER TABLE nav_setting ADD COLUMN hideGithub BOOLEAN;
		`
	_, err = db.Exec(sql_create_table)
	checkErr(err)

	// api token 表
	sql_create_table = `
		CREATE TABLE IF NOT EXISTS nav_api_token (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT,
			value TEXT,
			disabled INTEGER
		);
		`
	_, err = db.Exec(sql_create_table)
	checkErr(err)
	// img 表
	sql_create_table = `
		CREATE TABLE IF NOT EXISTS nav_img (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			url TEXT,
			value TEXT
		);
		`
	_, err = db.Exec(sql_create_table)
	checkErr(err)
	// 如果不存在，就初始化用户
	sql_get_user := `
		SELECT * FROM nav_user;
		`
	rows, err := db.Query(sql_get_user)
	checkErr(err)
	if !rows.Next() {
		sql_add_user := `
			INSERT INTO nav_user (id, name, password)
			VALUES (?, ?, ?);
			`
		stmt, err := db.Prepare(sql_add_user)
		checkErr(err)
		res, err := stmt.Exec(generateId(), "admin", "admin")
		checkErr(err)
		_, err = res.LastInsertId()
		checkErr(err)
		// fmt.Println(id)
	}
	rows.Close()
	// 如果不存在设置，就初始化
	sql_get_setting := `
		SELECT * FROM nav_setting;
		`
	rows, err = db.Query(sql_get_setting)
	checkErr(err)
	if !rows.Next() {
		sql_add_setting := `
			INSERT INTO nav_setting (id, favicon, title, govRecord, logo192, logo512, hideAdmin, hideGithub, jumpTargetBlank)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
			`
		stmt, err := db.Prepare(sql_add_setting)
		checkErr(err)
		res, err := stmt.Exec(0, "favicon.ico", "Van Nav", "", "logo192.png", "logo512.png", false, false, true)
		checkErr(err)
		_, err = res.LastInsertId()
		checkErr(err)
		// fmt.Println(id)
	}
	rows.Close()
	fmt.Println("数据库初始化成功。。。")
	migration()
}
