package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
	waProto "go.mau.fi/whatsmeow/proto/waE2E"
	"github.com/mdp/qrterminal/v3"
	"google.golang.org/protobuf/proto"
)

func eventHandler(evt interface{}) {
	switch v := evt.(type) {
	case *events.Message:
		fmt.Println("Received a message!", v.Message.GetConversation())
	}
}

func setupClient() *whatsmeow.Client {
	dbLog := waLog.Stdout("Database", "INFO", true)
	ctx := context.Background()
	sessionDir := "wa_session"
	if err := os.MkdirAll(sessionDir, 0755); err != nil {
		panic(err)
	}
	dbPath := "file:" + filepath.Join(sessionDir, "wa_session.db") + "?_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)"
	container, err := sqlstore.New(ctx, "sqlite", dbPath, dbLog)
	if err != nil {
		panic(err)
	}
	deviceStore, err := container.GetFirstDevice(ctx)
	if err != nil {
		panic(err)
	}
	clientLog := waLog.Stdout("Client", "INFO", true)
	client := whatsmeow.NewClient(deviceStore, clientLog)
	client.AddEventHandler(eventHandler)
	return client
}

func login() {
	client := setupClient()
	if client.Store.ID != nil {
		err := client.Connect()
		if err != nil {
			fmt.Println("Session expired, need to login again")
		} else {
			fmt.Println("Already logged in")
			client.Disconnect()
			return
		}
	}
	qrChan, _ := client.GetQRChannel(context.Background())
	err := client.Connect()
	if err != nil {
		panic(err)
	}
	for evt := range qrChan {
		if evt.Event == "code" {
			fmt.Println("Scan QR code di bawah:")
			qrterminal.GenerateHalfBlock(evt.Code, qrterminal.L, os.Stdout)
		} else if evt.Event == "success" {
			fmt.Println("Login successful")
			break
		} else {
			fmt.Println("Login event:", evt.Event)
		}
	}
	// Tunggu sampai log "Successfully authenticated" muncul
	time.Sleep(30 * time.Second)
	client.Disconnect()
}

func sendMessage(phone, msg string) {
	client := setupClient()
	if client.Store.ID == nil {
		fmt.Println("Not logged in")
		return
	}
	err := client.Connect()
	if err != nil {
		panic(err)
	}
	jid, _ := types.ParseJID(phone + "@s.whatsapp.net")
	_, err = client.SendMessage(context.Background(), jid, &waProto.Message{Conversation: proto.String(msg)})
	if err != nil {
		fmt.Println("Error sending message:", err)
	} else {
		fmt.Println("Message sent!")
	}
	client.Disconnect()
}

func logout() {
	client := setupClient()
	err := client.Connect()
	if err != nil {
		panic(err)
	}
	err = client.Logout(context.Background())
	if err != nil {
		fmt.Println("Error logging out:", err)
	} else {
		fmt.Println("Logged out successfully")
	}
	client.Disconnect()
}

func main() {
	var (
		loginFlag  = flag.Bool("login", false, "Login to WhatsApp")
		sendFlag   = flag.Bool("send", false, "Send message")
		logoutFlag = flag.Bool("logout", false, "Logout from WhatsApp")
		phone      = flag.String("phone", "", "Phone number for send (without @s.whatsapp.net)")
		message    = flag.String("message", "", "Message to send")
	)
	flag.Parse()

	if *loginFlag {
		login()
	} else if *sendFlag {
		if *phone == "" || *message == "" {
			fmt.Println("Phone and message are required for send")
			return
		}
		sendMessage(*phone, *message)
	} else if *logoutFlag {
		logout()
	} else {
		fmt.Println("Usage: go run whatsapp.go -login | -send -phone=<number> -message=<msg> | -logout")
	}
}
