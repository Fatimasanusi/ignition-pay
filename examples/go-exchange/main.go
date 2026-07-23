package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/stellar/go/clients/horizonclient"
	"github.com/stellar/go/keypair"
	"github.com/stellar/go/txnbuild"
)

type PaymentRequest struct {
	Destination string `json:"destination"`
	Amount      string `json:"amount"`
}

type WalletServer struct {
	client  *horizonclient.Client
	keypair *keypair.Full
}

func NewWalletServer(secretKey string) (*WalletServer, error) {
	kp, err := keypair.ParseFull(secretKey)
	if err != nil {
		return nil, err
	}
	return &WalletServer{
		client:  horizonclient.DefaultTestNetClient,
		keypair: kp,
	}, nil
}

func (ws *WalletServer) HandlePayment(w http.ResponseWriter, r *http.Request) {
	var req PaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	account, err := ws.client.AccountDetail(horizonclient.AccountRequest{
		AccountId: ws.keypair.Address(),
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	tx, err := txnbuild.NewTransaction(txnbuild.TransactionParams{
		SourceAccount:        &account,
		IncrementSequenceNum: true,
		Operations: []txnbuild.Operation{
			&txnbuild.Payment{
				Destination: req.Destination,
				Amount:      req.Amount,
				Asset:       txnbuild.NativeAsset{},
			},
		},
		BaseFee:       100,
		Memo:          nil,
		Preconditions: txnbuild.Preconditions{TimeBounds: txnbuild.NewInfiniteTimeout()},
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	tx, err = tx.Sign(ws.keypair)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	resp, err := ws.client.SubmitTransaction(tx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"hash": resp.Hash})
}

func main() {
	secretKey := os.Getenv("STELLAR_SECRET_KEY")
	if secretKey == "" {
		log.Fatal("STELLAR_SECRET_KEY environment variable required")
	}

	ws, err := NewWalletServer(secretKey)
	if err != nil {
		log.Fatal(err)
	}

	http.HandleFunc("/api/payments", ws.HandlePayment)
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	fmt.Printf("Exchange server listening on :%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
