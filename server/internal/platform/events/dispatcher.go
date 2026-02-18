package events

import (
	"context"
	"sync"
)

// Dispatcher gerencia publicação e subscrição de eventos
type Dispatcher struct {
	handlers map[EventType][]EventHandler
	mu       sync.RWMutex
}

// NewDispatcher cria novo dispatcher
func NewDispatcher() *Dispatcher {
	return &Dispatcher{
		handlers: make(map[EventType][]EventHandler),
	}
}

// Subscribe registra handler para um tipo de evento
func (d *Dispatcher) Subscribe(eventType EventType, handler EventHandler) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.handlers[eventType] = append(d.handlers[eventType], handler)
}

// Publish dispara evento para todos os handlers registrados
func (d *Dispatcher) Publish(ctx context.Context, event Event) error {
	d.mu.RLock()
	handlers := d.handlers[event.Type]
	d.mu.RUnlock()

	for _, handler := range handlers {
		if err := handler.Handle(ctx, event); err != nil {
			// Log error but don't stop other handlers
			// Pode usar channel para async se preferir
			continue
		}
	}
	return nil
}

// PublishAsync dispara evento de forma assíncrona
// Usa context.Background() para não depender do ciclo de vida do request
func (d *Dispatcher) PublishAsync(_ context.Context, event Event) {
	go func() {
		_ = d.Publish(context.Background(), event)
	}()
}
