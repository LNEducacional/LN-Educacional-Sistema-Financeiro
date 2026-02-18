package production

import "errors"

var (
	ErrJobNotFound            = errors.New("production job not found")
	ErrInvalidTransition      = errors.New("invalid status transition")
	ErrCommentRequired        = errors.New("comment is required for NAO_APROVADO status")
	ErrNoCollaboratorAssigned = errors.New("no collaborator assigned to job")
	ErrAlreadyProcessed       = errors.New("financial transaction already processed")
	ErrInsufficientData       = errors.New("insufficient data for operation")
	ErrHistoryNotFound        = errors.New("job history not found")
)
