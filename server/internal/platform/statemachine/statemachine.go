package statemachine

import "fmt"

// State representa um estado genérico (string ou enum)
type State interface {
	~string
}

// StateMachine define transições válidas entre estados
type StateMachine[S State] struct {
	transitions map[S][]S
	name        string // Para mensagens de erro mais claras
}

// NewStateMachine cria uma nova state machine
func NewStateMachine[S State](name string, transitions map[S][]S) *StateMachine[S] {
	return &StateMachine[S]{
		transitions: transitions,
		name:        name,
	}
}

// IsValidTransition verifica se a transição é válida
func (sm *StateMachine[S]) IsValidTransition(from, to S) bool {
	validStates, exists := sm.transitions[from]
	if !exists {
		return false
	}
	for _, valid := range validStates {
		if valid == to {
			return true
		}
	}
	return false
}

// ValidateTransition retorna erro descritivo se transição inválida
func (sm *StateMachine[S]) ValidateTransition(from, to S) error {
	if !sm.IsValidTransition(from, to) {
		return fmt.Errorf("%s: transição inválida de '%v' para '%v'", sm.name, from, to)
	}
	return nil
}

// GetValidNextStates retorna estados válidos a partir do estado atual
func (sm *StateMachine[S]) GetValidNextStates(current S) []S {
	return sm.transitions[current]
}

// IsFinalState verifica se é um estado terminal (sem transições)
func (sm *StateMachine[S]) IsFinalState(state S) bool {
	return len(sm.transitions[state]) == 0
}
