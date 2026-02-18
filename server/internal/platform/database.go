package platform

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

func NewDatabase(url string) *pgxpool.Pool {
	pool, err := pgxpool.New(context.Background(), url)
	if err != nil {
		log.Panicf("Unable to create connection pool: %v\n", err)
	}

	err = pool.Ping(context.Background())
	if err != nil {
		log.Panicf("Unable to ping database: %v\n", err)
	}

	log.Println("Database connected")
	return pool
}
